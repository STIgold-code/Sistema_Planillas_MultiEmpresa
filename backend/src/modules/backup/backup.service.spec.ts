import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough, Readable } from 'stream';
import { gunzipSync } from 'zlib';
import { BackupService } from './backup.service';
import { UploadsService } from '../uploads/uploads.service';

// Solo se sustituye `spawn`: el runtime de Prisma (que carga uploads.service)
// necesita el resto del módulo real.
jest.mock('child_process', () => {
  const real =
    jest.requireActual<typeof import('child_process')>('child_process');
  return { ...real, spawn: jest.fn() };
});

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

const spawnMock = jest.mocked(spawn);

describe('BackupService — subida por streaming', () => {
  let proceso: ProcesoFalso;
  let uploads: ReturnType<typeof crearUploadsFalso>;
  let servicio: BackupService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/planillas?x=1';
    proceso = new ProcesoFalso();
    spawnMock.mockReturnValue(proceso as unknown as ReturnType<typeof spawn>);
    uploads = crearUploadsFalso();
    servicio = new BackupService(uploads as unknown as UploadsService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    // Los errores de stream se emiten en el siguiente ciclo: se drenan antes
    // de restaurar los espías para no ensuciar la salida de los tests.
    await new Promise((resolve) => setImmediate(resolve));
    jest.restoreAllMocks();
    spawnMock.mockReset();
  });

  it('sube el dump comprimido sin acumularlo en memoria', async () => {
    const enCurso = servicio.createFullBackup();

    proceso.stdout.end('CREATE TABLE planillas();');
    proceso.emit('close', 0);

    const key = await enCurso;

    expect(key).toMatch(/^backups\/db\/\d{4}\/\d{2}\/.+\.sql\.gz$/);
    expect(uploads.uploadStream).toHaveBeenCalledTimes(1);
    expect(gunzipSync(uploads.subidos[0]).toString()).toBe(
      'CREATE TABLE planillas();',
    );
    // La contraseña de la URL nunca debe viajar como argumento con querystring.
    expect(spawnMock).toHaveBeenCalledWith('pg_dump', [
      'postgresql://u:p@localhost:5432/planillas',
    ]);
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
