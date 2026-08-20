import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { PassThrough, Readable } from 'stream';
import { gunzipSync } from 'zlib';
import {
  BackupService,
  BYTES_MINIMOS_BACKUP,
  MENSAJE_PG_DUMP_AUSENTE,
} from './backup.service';
import { UploadsService } from '../uploads/uploads.service';
import { AlmacenamientoObjetosService } from '../uploads/almacenamiento-objetos.service';

// Solo se sustituye `spawn`: el runtime de Prisma (que carga uploads.service)
// necesita el resto del módulo real.
jest.mock('child_process', () => {
  const real =
    jest.requireActual<typeof import('child_process')>('child_process');
  return { ...real, spawn: jest.fn() };
});

/**
 * Dump sintético que, ya comprimido, supera `BYTES_MINIMOS_BACKUP`: base64 de
 * bytes aleatorios apenas se comprime, así que el tamaño es predecible. Los
 * tests tienen que ejercitar el umbral real, no una versión relajada de él.
 */
const DUMP_REALISTA = `-- backup de prueba\n${randomBytes(32 * 1024).toString(
  'base64',
)}\n`;

/** Dump que muere apenas arrancado: comprimido pesa unas decenas de bytes. */
const DUMP_TRUNCADO = 'CREATE TABLE planillas();';

/** Doble de `pg_dump`: expone stdout/stderr y los eventos del proceso. */
class ProcesoFalso extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
}

/**
 * Consume el stream entero para simular la subida real. Si el stream se
 * destruye con error (dump fallido), la promesa se rechaza — igual que
 * abortaría el multipart de Wasabi.
 */
function crearUploadsFalso() {
  const subidos: Buffer[] = [];
  const uploadStream = jest.fn(
    (stream: Readable, key: string): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        const partes: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => partes.push(chunk));
        stream.on('end', () => {
          subidos.push(Buffer.concat(partes));
          resolve(key);
        });
        stream.on('error', reject);
      }),
  );
  return { uploadStream, subidos };
}

/**
 * Doble del almacenamiento: por defecto confirma exactamente lo que el
 * uploader recibió, que es el caso sano. Cada test que quiera simular un
 * objeto ausente o de tamaño distinto sobreescribe la implementación.
 */
function crearAlmacenamientoFalso(
  uploads: ReturnType<typeof crearUploadsFalso>,
) {
  const obtenerTamanioObjeto = jest.fn<Promise<number | null>, [key: string]>(
    () => {
      const ultimo = uploads.subidos[uploads.subidos.length - 1];
      return Promise.resolve(ultimo ? ultimo.length : null);
    },
  );
  return { obtenerTamanioObjeto };
}

/**
 * Doble de `pg_dump` que responde solo: emite la salida y cierra en el
 * siguiente ciclo, una vez que el servicio ya se suscribió a sus eventos.
 */
function procesoQueResponde(salida: string, codigo = 0): ProcesoFalso {
  const proceso = new ProcesoFalso();
  setImmediate(() => {
    proceso.stdout.end(salida);
    proceso.emit('close', codigo);
  });
  return proceso;
}

/** `spawn` que siempre falla con ENOENT: el binario no está en la imagen. */
function spawnSinPgDump(): ReturnType<typeof spawn> {
  const proceso = new ProcesoFalso();
  setImmediate(() => proceso.emit('error', new Error('spawn ENOENT')));
  return proceso as unknown as ReturnType<typeof spawn>;
}

const spawnMock = jest.mocked(spawn);

const comoProceso = (proceso: ProcesoFalso): ReturnType<typeof spawn> =>
  proceso as unknown as ReturnType<typeof spawn>;

/** Espera a que `condicion` se cumpla, cediendo el event loop entre intentos. */
async function esperarHasta(
  condicion: () => boolean,
  intentos = 100,
): Promise<void> {
  for (let i = 0; i < intentos && !condicion(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe('BackupService — subida por streaming', () => {
  let proceso: ProcesoFalso;
  let uploads: ReturnType<typeof crearUploadsFalso>;
  let almacenamiento: ReturnType<typeof crearAlmacenamientoFalso>;
  let servicio: BackupService;

  /** Corre un backup completo alimentando el dump con `contenido`. */
  function ejecutarBackup(contenido = DUMP_REALISTA) {
    const enCurso = servicio.createFullBackup();
    proceso.stdout.end(contenido);
    proceso.emit('close', 0);
    return enCurso;
  }

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/planillas?x=1';
    proceso = new ProcesoFalso();
    // Primera llamada: la sonda de versión. Las siguientes: el dump.
    spawnMock
      .mockReturnValueOnce(
        comoProceso(procesoQueResponde('pg_dump (PostgreSQL) 18.4\n')),
      )
      .mockReturnValue(comoProceso(proceso));
    uploads = crearUploadsFalso();
    almacenamiento = crearAlmacenamientoFalso(uploads);
    servicio = new BackupService(
      uploads as unknown as UploadsService,
      almacenamiento as unknown as AlmacenamientoObjetosService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // El disparo manual exige pg_dump comprobado, igual que el cron.
    await servicio.verificarDisponibilidadPgDump();
  });

  afterEach(async () => {
    // Los errores de stream se emiten en el siguiente ciclo: se drenan antes
    // de restaurar los espías para no ensuciar la salida de los tests.
    await new Promise((resolve) => setImmediate(resolve));
    jest.restoreAllMocks();
    spawnMock.mockReset();
  });

  it('sube el dump comprimido sin acumularlo en memoria', async () => {
    const resultado = await ejecutarBackup();

    expect(resultado.key).toMatch(/^backups\/db\/\d{4}\/\d{2}\/.+\.sql\.gz$/);
    expect(uploads.uploadStream).toHaveBeenCalledTimes(1);
    expect(gunzipSync(uploads.subidos[0]).toString()).toBe(DUMP_REALISTA);
    // La contraseña de la URL nunca debe viajar como argumento con querystring.
    expect(spawnMock).toHaveBeenCalledWith('pg_dump', [
      'postgresql://u:p@localhost:5432/planillas',
    ]);
  });

  it('reporta cuántos bytes subió y cuántos confirmó el almacenamiento', async () => {
    const resultado = await ejecutarBackup();

    expect(resultado.bytes).toBe(uploads.subidos[0].length);
    expect(resultado.bytesVerificados).toBe(resultado.bytes);
    expect(resultado.bytes).toBeGreaterThan(BYTES_MINIMOS_BACKUP);
    expect(almacenamiento.obtenerTamanioObjeto).toHaveBeenCalledWith(
      resultado.key,
    );
  });

  it('falla si el objeto no aparece en el almacenamiento tras subirlo', async () => {
    almacenamiento.obtenerTamanioObjeto.mockResolvedValue(null);

    await expect(ejecutarBackup()).rejects.toThrow(
      'no existe en el almacenamiento',
    );
  });

  it('falla si el tamaño almacenado no coincide con lo subido', async () => {
    almacenamiento.obtenerTamanioObjeto.mockResolvedValue(42);

    await expect(ejecutarBackup()).rejects.toThrow('Backup corrupto');
  });

  it('falla si el dump sale sospechosamente pequeño', async () => {
    await expect(ejecutarBackup(DUMP_TRUNCADO)).rejects.toThrow(
      'Backup sospechosamente pequeño',
    );
  });

  it('falla el backup si pg_dump termina con código distinto de cero', async () => {
    const enCurso = servicio.createFullBackup();

    proceso.stdout.write('dump a medias');
    proceso.emit('close', 1);

    await expect(enCurso).rejects.toThrow('pg_dump terminó con código 1');
  });

  it('falla el backup si pg_dump no puede siquiera arrancar', async () => {
    const enCurso = servicio.createFullBackup();

    proceso.emit('error', new Error('ENOENT'));

    await expect(enCurso).rejects.toThrow('Error al iniciar pg_dump');
  });

  it('exige DATABASE_URL definida', async () => {
    delete process.env.DATABASE_URL;

    await expect(servicio.createFullBackup()).rejects.toThrow('DATABASE_URL');
  });
});

describe('BackupService — verificación de pg_dump al arrancar', () => {
  let uploads: ReturnType<typeof crearUploadsFalso>;
  let almacenamiento: ReturnType<typeof crearAlmacenamientoFalso>;
  let servicio: BackupService;
  let logError: jest.SpyInstance;
  let logInfo: jest.SpyInstance;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/planillas?x=1';
    uploads = crearUploadsFalso();
    almacenamiento = crearAlmacenamientoFalso(uploads);
    servicio = new BackupService(
      uploads as unknown as UploadsService,
      almacenamiento as unknown as AlmacenamientoObjetosService,
    );
    logInfo = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    jest.restoreAllMocks();
    spawnMock.mockReset();
  });

  it('registra un diagnóstico accionable y no intenta el backup si falta pg_dump', async () => {
    spawnMock.mockImplementation(spawnSinPgDump);

    await servicio.onModuleInit();

    // Una sola llamada: la sonda de versión. El dump nunca se intenta.
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith('pg_dump', ['--version']);
    expect(uploads.uploadStream).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(MENSAJE_PG_DUMP_AUSENTE),
    );
  });

  it('omite el backup nocturno con un mensaje accionable si falta pg_dump', async () => {
    spawnMock.mockImplementation(spawnSinPgDump);
    await servicio.onModuleInit();
    spawnMock.mockClear();
    logError.mockClear();

    await servicio.handleDailyBackup();

    expect(spawnMock).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(MENSAJE_PG_DUMP_AUSENTE),
    );
  });

  it('rechaza el disparo manual con 503 accionable si falta pg_dump', async () => {
    spawnMock.mockImplementation(spawnSinPgDump);
    await servicio.onModuleInit();
    spawnMock.mockClear();

    const error: unknown = await servicio
      .createFullBackup()
      .catch((err: unknown) => err);

    // 503: al servidor le falta una dependencia para atender el pedido. Un
    // `Error` pelado se convertiría en el 500 "Internal server error" opaco
    // que hacía imposible diagnosticar esto desde afuera.
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect((error as ServiceUnavailableException).message).toContain(
      MENSAJE_PG_DUMP_AUSENTE,
    );
    // Falla antes de spawnear: no hay ENOENT que interpretar.
    expect(spawnMock).not.toHaveBeenCalled();
    expect(uploads.uploadStream).not.toHaveBeenCalled();
  });

  it('registra la versión del cliente y ejecuta el backup de inicio', async () => {
    const dump = new ProcesoFalso();
    let llamadas = 0;
    spawnMock.mockImplementation(() => {
      llamadas += 1;
      return comoProceso(
        llamadas === 1
          ? procesoQueResponde('pg_dump (PostgreSQL) 18.4\n')
          : dump,
      );
    });

    await servicio.onModuleInit();

    expect(spawnMock).toHaveBeenNthCalledWith(1, 'pg_dump', ['--version']);
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining('pg_dump (PostgreSQL) 18.4'),
    );

    // El backup de inicio ya arrancó (no bloqueante): se cierra el dump para
    // que la subida termine y la promesa no quede colgada.
    dump.stdout.end(DUMP_REALISTA);
    dump.emit('close', 0);
    // La compresión corre en el threadpool de libuv: no alcanza con un tick.
    await esperarHasta(() =>
      (logInfo.mock.calls as unknown[][]).some((argumentos) =>
        argumentos.some(
          (argumento) =>
            typeof argumento === 'string' &&
            argumento.includes('Backup de inicio completado'),
        ),
      ),
    );

    expect(spawnMock).toHaveBeenNthCalledWith(2, 'pg_dump', [
      'postgresql://u:p@localhost:5432/planillas',
    ]);
    expect(uploads.uploadStream).toHaveBeenCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining('Backup de inicio completado'),
    );
  });
});
