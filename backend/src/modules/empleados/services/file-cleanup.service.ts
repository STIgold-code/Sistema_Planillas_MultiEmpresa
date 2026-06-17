import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';

interface FileReference {
  url: string;
  source: string;
}

interface CleanupResult {
  deleted: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * Recolecta todas las URLs de archivos asociados a un empleado
   * antes de eliminarlo.
   */
  async collectEmpleadoFiles(empleadoId: number): Promise<FileReference[]> {
    const files: FileReference[] = [];

    // 1. Foto del empleado
    const empleado = await this.prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { foto_url: true },
    });
    if (empleado?.foto_url) {
      files.push({ url: empleado.foto_url, source: 'Empleado.foto' });
    }

    // 2. EmpleadoDocumento.archivo_url
    const empleadoDocs = await this.prisma.empleadoDocumento.findMany({
      where: { empleado_id: empleadoId },
      select: { archivo_url: true },
    });
    for (const doc of empleadoDocs) {
      if (doc.archivo_url) {
        files.push({ url: doc.archivo_url, source: 'EmpleadoDocumento' });
      }
    }

    // 3. DocumentoGenerado.archivo_url y archivo_firmado_url
    const docGenerados = await this.prisma.documentoGenerado.findMany({
      where: { empleado_id: empleadoId },
      select: { archivo_url: true, archivo_firmado_url: true },
    });
    for (const doc of docGenerados) {
      if (doc.archivo_url) {
        files.push({ url: doc.archivo_url, source: 'DocumentoGenerado' });
      }
      if (doc.archivo_firmado_url) {
        files.push({
          url: doc.archivo_firmado_url,
          source: 'DocumentoGenerado.firmado',
        });
      }
    }

    // 4. Contrato.archivo_url
    const contratos = await this.prisma.contrato.findMany({
      where: { empleado_id: empleadoId },
      select: { archivo_url: true },
    });
    for (const contrato of contratos) {
      if (contrato.archivo_url) {
        files.push({ url: contrato.archivo_url, source: 'Contrato' });
      }
    }

    return files;
  }

  /**
   * Extrae la key del archivo desde una URL completa o path relativo
   */
  private extractKeyFromUrl(url: string): string {
    // Si es una URL completa, extraer solo la parte del path
    // Ejemplos:
    // - http://localhost:4001/uploads/empleados/123/foto.jpg -> empleados/123/foto.jpg
    // - http://localhost:4001/api/files/key/empleados%2F123%2Ffoto.jpg -> empleados/123/foto.jpg
    // - empleados/123/foto.jpg -> empleados/123/foto.jpg (ya es key)

    if (url.includes('/uploads/')) {
      const parts = url.split('/uploads/');
      return parts[parts.length - 1];
    }

    if (url.includes('/files/key/')) {
      const parts = url.split('/files/key/');
      return decodeURIComponent(parts[parts.length - 1]);
    }

    // Ya es una key relativa
    return url;
  }

  /**
   * Elimina archivos físicos de forma segura (best-effort)
   * Los errores se loguean pero no detienen el proceso.
   */
  async deleteFiles(files: FileReference[]): Promise<CleanupResult> {
    const result: CleanupResult = { deleted: 0, failed: 0, errors: [] };

    for (const file of files) {
      if (!file.url) continue;

      try {
        const key = this.extractKeyFromUrl(file.url);
        const deleted = await this.uploadsService.deleteFileHybrid(key);

        if (deleted) {
          result.deleted++;
          this.logger.log(`Archivo eliminado: ${key} (${file.source})`);
        } else {
          result.failed++;
          result.errors.push(`No se pudo eliminar: ${key}`);
        }
      } catch (error) {
        result.failed++;
        const errorMsg = `Error eliminando ${file.url}: ${error.message}`;
        result.errors.push(errorMsg);
        this.logger.warn(errorMsg);
      }
    }

    return result;
  }
}
