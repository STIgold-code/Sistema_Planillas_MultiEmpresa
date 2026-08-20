import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { UploadsService } from '../uploads/uploads.service';
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

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  /**
   * Se resuelve una sola vez al arrancar: dentro de la vida del proceso el
   * binario no puede aparecer ni desaparecer, y un redeploy vuelve a ejecutar
   * `onModuleInit`.
   */
  private pgDumpDisponible = false;

  constructor(private readonly uploadsService: UploadsService) {}

  async onModuleInit() {
    this.logger.log('🚀 Servicio de Backups Automatizados inicializado.');

    const version = await this.resolverVersionPgDump();
    this.pgDumpDisponible = version !== null;

    if (!this.pgDumpDisponible) {
      // Se corta acá: intentar el backup de inicio solo produciría un ENOENT
      // sin explicación. El mensaje tiene que decir qué hacer.
      this.logger.error(`❌ ${MENSAJE_PG_DUMP_AUSENTE}`);
      return;
    }

    // La versión del cliente importa tanto como su presencia: pg_dump se niega
    // a volcar un servidor más nuevo que él mismo.
    this.logger.log(`🐘 Cliente de PostgreSQL detectado: ${version}`);

    // Ejecutar backup al inicio para verificación (No bloqueante)
    this.createFullBackup()
      .then((key) => this.logger.log(`✅ Backup de inicio completado: ${key}`))
      .catch((err: unknown) => {
        const mensaje = obtenerMensajeError(err);
        this.logger.error(`❌ Error en backup de inicio: ${mensaje}`);
      });
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
      const result = await this.createFullBackup();
      this.logger.log(`✅ Backup completado exitosamente: ${result}`);
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

  /**
   * Ejecuta el proceso de backup y subida
   */
  async createFullBackup(): Promise<string> {
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

    this.logger.log(
      `📤 Backup subido: ${key} (${(bytesComprimidos / 1024).toFixed(0)} KB)`,
    );

    return key;
  }
}
