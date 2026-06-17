import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { UploadsService } from '../uploads/uploads.service';
import { PassThrough } from 'stream';

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly uploadsService: UploadsService) {}

  onModuleInit() {
    this.logger.log('🚀 Servicio de Backups Automatizados inicializado.');
    // Ejecutar backup al inicio para verificación (No bloqueante)
    this.createFullBackup()
      .then((key) => this.logger.log(`✅ Backup de inicio completado: ${key}`))
      .catch((err) =>
        this.logger.error(`❌ Error en backup de inicio: ${err.message}`),
      );
  }

  /**
   * Tarea programada: Todos los días a las 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyBackup() {
    this.logger.log('🌙 Iniciando backup nocturno programado...');
    try {
      const result = await this.createFullBackup();
      this.logger.log(`✅ Backup completado exitosamente: ${result}`);
    } catch (error) {
      this.logger.error(`❌ Error en el backup programado: ${error.message}`);
    }
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

    // 1. Ejecutar pg_dump y acumular el resultado comprimido en memoria
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const pgDump = spawn('pg_dump', [cleanDbUrl]);
      const gzip = createGzip();
      const chunks: Buffer[] = [];

      pgDump.stdout.pipe(gzip);

      gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzip.on('error', (err) =>
        reject(new Error(`gzip error: ${err.message}`)),
      );

      pgDump.stderr.on('data', (data) => {
        this.logger.warn(`[pg_dump stderr]: ${data}`);
      });

      pgDump.on('error', (err) => {
        reject(new Error(`Error al iniciar pg_dump: ${err.message}`));
      });

      pgDump.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump failed with code ${code}`));
          return;
        }
        gzip.on('end', () => resolve(Buffer.concat(chunks)));
      });
    });

    // 2. Solo subir si pg_dump terminó exitosamente
    const stream = new PassThrough();
    stream.end(buffer);

    await this.uploadsService.uploadStream(stream, key, 'application/gzip');
    this.logger.log(
      `📤 Backup subido: ${key} (${(buffer.length / 1024).toFixed(0)} KB)`,
    );

    return key;
  }
}
