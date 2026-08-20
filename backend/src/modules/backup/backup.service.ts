import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { UploadsService } from '../uploads/uploads.service';
import { AlmacenamientoObjetosService } from '../uploads/almacenamiento-objetos.service';
import { Transform } from 'stream';
import { obtenerMensajeError } from '../../common/utils/error.util';

/**
 * Mensaje único para el fallo más caro que puede tener este servicio: que el
 * binario `pg_dump` no exista en la imagen. Sin él no hay backup posible, y el
 * síntoma (un ENOENT dentro del cron de las 2 AM) pasa desapercibido durante
 * meses. Se expone para que los tests validen el diagnóstico exacto.
 */
export const MENSAJE_PG_DUMP_AUSENTE =
  'pg_dump NO está disponible en el contenedor: los backups automáticos están ' +
  'DESACTIVADOS. Instala postgresql-client-18 en la imagen (ver ' +
  'backend/Dockerfile) y vuelve a desplegar.';

/**
 * Piso de bytes comprimidos por debajo del cual el backup se considera fallido
 * aunque `pg_dump` haya devuelto 0 y la subida haya terminado.
 *
 * Cómo se eligió: el schema tiene 83 tablas y ~2600 líneas de definición, así
 * que un dump que solo trae el DDL (sin una sola fila) ya ronda las decenas de
 * KB comprimidos, y uno con datos reales de planilla es mucho mayor. En el
 * otro extremo, un stream vacío comprimido pesa 20 bytes y un dump que muere
 * después de la cabecera, unos cientos.
 *
 * 16 KB queda tres órdenes de magnitud por encima del ruido y muy por debajo
 * de cualquier dump legítimo de este schema. Es deliberadamente conservador:
 * el objetivo es que jamás falle un backup bueno, y aun así ningún dump
 * truncado o vacío pueda pasar como éxito. Si algún día la base se vacía de
 * verdad, el fallo es el aviso correcto, no un falso OK.
 */
export const BYTES_MINIMOS_BACKUP = 16 * 1024;

/**
 * Resultado verificable de un backup: no basta con "no explotó", hace falta
 * saber cuánto se subió y que el almacenamiento lo confirme.
 */
export interface ResultadoBackup {
  /** Ruta del objeto dentro del bucket (o del disco, en modo local). */
  readonly key: string;
  /** Bytes comprimidos medidos en el stream durante la subida. */
  readonly bytes: number;
  /** Bytes que el almacenamiento reporta para ese objeto tras la subida. */
  readonly bytesVerificados: number;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  /**
   * Se resuelve una sola vez al arrancar: dentro de la vida del proceso el
   * binario no puede aparecer ni desaparecer, y un redeploy vuelve a ejecutar
   * `onModuleInit`.
   */
  private pgDumpDisponible = false;

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly almacenamiento: AlmacenamientoObjetosService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Servicio de Backups Automatizados inicializado.');

    if (!(await this.verificarDisponibilidadPgDump())) {
      // Se corta acá: intentar el backup de inicio solo produciría un ENOENT
      // sin explicación. El mensaje tiene que decir qué hacer.
      this.logger.error(`❌ ${MENSAJE_PG_DUMP_AUSENTE}`);
      return;
    }

    // Ejecutar backup al inicio para verificación (No bloqueante)
    this.createFullBackup()
      .then((resultado) =>
        this.logger.log(
          `✅ Backup de inicio completado: ${this.describir(resultado)}`,
        ),
      )
      .catch((err: unknown) => {
        const mensaje = obtenerMensajeError(err);
        this.logger.error(`❌ Error en backup de inicio: ${mensaje}`);
      });
  }

  /**
   * Sondea `pg_dump`, cachea el resultado y registra la versión detectada.
   * La versión importa tanto como la presencia: pg_dump se niega a volcar un
   * servidor más nuevo que él mismo.
   */
  async verificarDisponibilidadPgDump(): Promise<boolean> {
    const version = await this.resolverVersionPgDump();
    this.pgDumpDisponible = version !== null;

    if (version !== null) {
      this.logger.log(`🐘 Cliente de PostgreSQL detectado: ${version}`);
    }

    return this.pgDumpDisponible;
  }

  /**
   * Tarea programada: Todos los días a las 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyBackup() {
    if (!this.pgDumpDisponible) {
      this.logger.error(
        `❌ Backup nocturno omitido. ${MENSAJE_PG_DUMP_AUSENTE}`,
      );
      return;
    }

    this.logger.log('🌙 Iniciando backup nocturno programado...');
    try {
      const resultado = await this.createFullBackup();
      this.logger.log(
        `✅ Backup completado exitosamente: ${this.describir(resultado)}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `❌ Error en el backup programado: ${obtenerMensajeError(error)}`,
      );
    }
  }

  /**
   * Devuelve la versión del `pg_dump` instalado, o `null` si el binario no
   * existe o no se puede ejecutar. Nunca lanza: es una sonda de diagnóstico.
   */
  private resolverVersionPgDump(): Promise<string | null> {
    return new Promise((resolve) => {
      const proceso = spawn('pg_dump', ['--version']);
      let salida = '';

      proceso.stdout.on('data', (chunk: Buffer) => {
        salida += chunk.toString();
      });

      // ENOENT (binario ausente) llega por 'error', no por 'close'.
      proceso.on('error', () => resolve(null));
      proceso.on('close', (codigo) =>
        resolve(codigo === 0 ? salida.trim() : null),
      );
    });
  }

  private describir(resultado: ResultadoBackup): string {
    return `${resultado.key} (${(resultado.bytes / 1024).toFixed(0)} KB)`;
  }

  /**
   * Ejecuta el proceso de backup y subida
   */
  async createFullBackup(): Promise<ResultadoBackup> {
    // Misma guarda que usa el cron. Sin esto el disparo manual llegaba al
    // `spawn`, moría con ENOENT y salía como 500 opaco: el operador no tenía
    // forma de saber que faltaba un binario en la imagen.
    if (!this.pgDumpDisponible) {
      throw new ServiceUnavailableException(MENSAJE_PG_DUMP_AUSENTE);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no definida en las variables de entorno');
    }

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const timestamp = ahora.toISOString().replace(/[:.]/g, '-').slice(0, 16);

    const filename = `backup_rrhh_${timestamp}.sql.gz`;
    const key = `backups/db/${anio}/${mes}/${filename}`;

    this.logger.log(`📦 Generando backup: ${filename}...`);

    const cleanDbUrl = dbUrl.split('?')[0];

    // Streaming directo: pg_dump → gzip → contador → uploadStream, sin
    // acumular el dump en memoria. Con la base creciendo, el `Buffer.concat`
    // del dump completo arriesgaba OOM en Railway en cada arranque y en el
    // cron de las 2AM.
    const pgDump = spawn('pg_dump', [cleanDbUrl]);
    const gzip = createGzip();
    let bytesComprimidos = 0;

    // El conteo va en un Transform y NO en un listener `gzip.on('data')`:
    // suscribirse a 'data' pone el stream en modo fluido y puede consumir
    // chunks antes de que el uploader empiece a leerlos, además de anular la
    // contrapresión. Un Transform cuenta sin alterar el modo del stream.
    const contadorBytes = new Transform({
      transform(chunk: Buffer, _codificacion, callback) {
        bytesComprimidos += chunk.length;
        callback(null, chunk);
      },
    });

    pgDump.stderr.on('data', (data: Buffer) => {
      this.logger.warn(`[pg_dump stderr]: ${data.toString()}`);
    });

    pgDump.stdout.pipe(gzip).pipe(contadorBytes);

    // `pipe` no propaga errores: sin este listener, destruir el contador
    // dejaría un 'error' sin manejar y tumbaría el proceso.
    contadorBytes.on('error', (err) => {
      this.logger.error(`Subida de backup abortada: ${err.message}`);
    });

    // Si el dump falla, se destruye el stream que consume la subida para
    // abortar el multipart en curso (uploadStream usa leavePartsOnError:
    // false, así que las partes ya enviadas se descartan). Sin esto, un dump
    // truncado quedaría almacenado y marcado como backup exitoso.
    const abortarSubida = (error: Error) => {
      gzip.destroy(error);
      contadorBytes.destroy(error);
    };

    const pgDumpExito = new Promise<void>((resolve, reject) => {
      pgDump.on('error', (err) => {
        const error = new Error(`Error al iniciar pg_dump: ${err.message}`);
        abortarSubida(error);
        reject(error);
      });
      pgDump.on('close', (code) => {
        if (code !== 0) {
          const error = new Error(`pg_dump terminó con código ${code}`);
          abortarSubida(error);
          reject(error);
        } else {
          resolve();
        }
      });
      gzip.on('error', (err) => {
        const error = new Error(`Error de compresión gzip: ${err.message}`);
        contadorBytes.destroy(error);
        reject(error);
      });
    });

    // Se esperan ambas: la subida no se da por buena si pg_dump falló.
    await Promise.all([
      this.uploadsService.uploadStream(contadorBytes, key, 'application/gzip'),
      pgDumpExito,
    ]);

    const bytesVerificados = await this.verificarObjetoSubido(
      key,
      bytesComprimidos,
    );

    this.logger.log(
      `📤 Backup subido y verificado: ${key} ` +
        `(${(bytesComprimidos / 1024).toFixed(0)} KB)`,
    );

    return { key, bytes: bytesComprimidos, bytesVerificados };
  }

  /**
   * Confirma contra el almacenamiento que el objeto existe y pesa lo que se
   * subió. Que `uploadStream` resuelva sin error no prueba que el objeto haya
   * quedado íntegro del otro lado; sin esta consulta, un backup vacío o
   * truncado devuelve exactamente la misma respuesta que uno bueno.
   *
   * @returns los bytes confirmados por el almacenamiento.
   */
  private async verificarObjetoSubido(
    key: string,
    bytesSubidos: number,
  ): Promise<number> {
    const bytesAlmacenados =
      await this.almacenamiento.obtenerTamanioObjeto(key);

    if (bytesAlmacenados === null) {
      throw new InternalServerErrorException(
        `Backup NO verificable: el objeto "${key}" no existe en el ` +
          'almacenamiento después de subirlo. El backup se considera fallido.',
      );
    }

    if (bytesAlmacenados !== bytesSubidos) {
      throw new InternalServerErrorException(
        `Backup corrupto: se subieron ${bytesSubidos} bytes pero el ` +
          `almacenamiento reporta ${bytesAlmacenados} para "${key}". ` +
          'El backup se considera fallido.',
      );
    }

    // El objeto sospechoso NO se borra a propósito: sirve para diagnosticar
    // por qué el dump salió vacío. Queda registrado en el log con su key.
    if (bytesAlmacenados < BYTES_MINIMOS_BACKUP) {
      throw new InternalServerErrorException(
        `Backup sospechosamente pequeño: ${bytesAlmacenados} bytes para ` +
          `"${key}", por debajo del mínimo de ${BYTES_MINIMOS_BACKUP} bytes. ` +
          'Probablemente el dump salió vacío o truncado; se considera fallido.',
      );
    }

    return bytesAlmacenados;
  }
}
