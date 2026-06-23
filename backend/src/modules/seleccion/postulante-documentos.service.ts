import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UPLOAD_PATHS } from '../uploads/uploads.config';
import { CreatePostulanteDocumentoDto } from './dto';
import { Postulante, Prisma } from '@prisma/client';
import {
  parsearFechaISOenPeru,
  ahoraPeru,
} from '../../common/utils/datetime.util';

@Injectable()
export class PostulanteDocumentosService {
  private readonly logger = new Logger(PostulanteDocumentosService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async getDocumentos(postulanteId: number) {
    const documentos = await this.prisma.postulanteDocumento.findMany({
      where: {
        postulante_id: postulanteId,
        es_version_vigente: true,
        eliminado: false,
      },
      orderBy: { fecha_carga: 'desc' },
      include: {
        tipo_documento_empleado: {
          select: { id: true, codigo: true, nombre: true },
        },
        subido_por: {
          select: { id: true, email: true, nombre_completo: true },
        },
      },
    });

    const documentosConVersiones = await Promise.all(
      documentos.map(async (doc) => {
        const origenId = doc.documento_origen_id ?? doc.id;
        const totalVersiones = await this.prisma.postulanteDocumento.count({
          where: {
            OR: [{ id: origenId }, { documento_origen_id: origenId }],
            eliminado: false,
          },
        });

        return {
          ...doc,
          archivo_url: doc.archivo_url
            ? this.uploadsService.getFileUrl(doc.archivo_url)
            : null,
          total_versiones: totalVersiones,
        };
      }),
    );

    return documentosConVersiones;
  }

  async createDocumentoConArchivo(
    postulanteId: number,
    postulante: Postulante,
    file: Express.Multer.File,
    data: CreatePostulanteDocumentoDto,
    usuarioId?: number,
  ) {
    if (postulante.empleado_id) {
      throw new BadRequestException(
        'No se pueden agregar documentos a un postulante ya convertido a empleado',
      );
    }

    const filename = this.uploadsService.generateFilename(
      'doc',
      file.originalname,
    );
    const key = this.uploadsService.generateKey(
      UPLOAD_PATHS.postulantes,
      postulanteId,
      filename,
    );

    const storedPath = await this.uploadsService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    const documento = await this.prisma.postulanteDocumento.create({
      data: {
        postulante_id: postulanteId,
        descripcion: data.descripcion,
        tipo_documento_empleado_id: data.tipo_documento_empleado_id || null,
        archivo_url: storedPath,
        archivo_nombre: file.originalname,
        fecha_emision: data.fecha_emision
          ? parsearFechaISOenPeru(data.fecha_emision)
          : null,
        fecha_vencimiento: data.fecha_vencimiento
          ? parsearFechaISOenPeru(data.fecha_vencimiento)
          : null,
        subido_por_id: usuarioId ?? null,
      },
      include: {
        tipo_documento_empleado: {
          select: { id: true, codigo: true, nombre: true },
        },
      },
    });

    return {
      ...documento,
      archivo_url: this.uploadsService.getFileUrl(storedPath),
    };
  }

  async crearNuevaVersionDocumento(
    documentoId: number,
    postulanteId: number,
    postulante: Postulante,
    file: Express.Multer.File,
    motivo: string,
    usuarioId: number,
  ) {
    if (postulante.empleado_id) {
      throw new BadRequestException(
        'No se pueden modificar documentos de un postulante ya convertido a empleado',
      );
    }

    const documentoAnterior = await this.prisma.postulanteDocumento.findFirst({
      where: {
        id: documentoId,
        postulante_id: postulanteId,
        es_version_vigente: true,
        eliminado: false,
      },
    });

    if (!documentoAnterior) {
      throw new NotFoundException(
        'Documento no encontrado o ya no es la versión vigente',
      );
    }

    const origenId =
      documentoAnterior.documento_origen_id ?? documentoAnterior.id;

    const versionActual = await this.prisma.postulanteDocumento.count({
      where: {
        OR: [{ id: origenId }, { documento_origen_id: origenId }],
      },
    });

    const filename = this.uploadsService.generateFilename(
      'doc',
      file.originalname,
    );
    const key = this.uploadsService.generateKey(
      UPLOAD_PATHS.postulantes,
      postulanteId,
      filename,
    );

    const storedPath = await this.uploadsService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    let nuevoDocumento: Prisma.PostulanteDocumentoGetPayload<{
      include: {
        tipo_documento_empleado: {
          select: { id: true; codigo: true; nombre: true };
        };
        subido_por: {
          select: { id: true; email: true; nombre_completo: true };
        };
      };
    }>;
    try {
      nuevoDocumento = await this.prisma.$transaction(async (tx) => {
        await tx.postulanteDocumento.update({
          where: { id: documentoAnterior.id },
          data: { es_version_vigente: false },
        });

        const nuevo = await tx.postulanteDocumento.create({
          data: {
            postulante_id: postulanteId,
            tipo_documento_empleado_id:
              documentoAnterior.tipo_documento_empleado_id,
            descripcion: documentoAnterior.descripcion,
            archivo_url: storedPath,
            archivo_nombre: file.originalname,
            fecha_emision: documentoAnterior.fecha_emision,
            fecha_vencimiento: documentoAnterior.fecha_vencimiento,
            version: versionActual + 1,
            es_version_vigente: true,
            documento_origen_id: origenId,
            motivo_nueva_version: motivo,
            subido_por_id: usuarioId,
          },
          include: {
            tipo_documento_empleado: {
              select: { id: true, codigo: true, nombre: true },
            },
            subido_por: {
              select: { id: true, email: true, nombre_completo: true },
            },
          },
        });

        return nuevo;
      });
    } catch (error) {
      try {
        await this.uploadsService.deleteFileHybrid(storedPath);
      } catch (cleanupError) {
        const mensaje =
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError);
        this.logger.warn(
          `No se pudo limpiar archivo huérfano ${storedPath}: ${mensaje}`,
        );
      }
      throw error;
    }

    this.logger.log(
      `Nueva versión (v${nuevoDocumento.version}) creada para documento #${documentoAnterior.id} del postulante #${postulanteId}`,
    );

    return {
      ...nuevoDocumento,
      archivo_url: this.uploadsService.getFileUrl(storedPath),
    };
  }

  async getHistorialDocumento(documentoId: number, postulanteId: number) {
    const documento = await this.prisma.postulanteDocumento.findFirst({
      where: { id: documentoId, postulante_id: postulanteId },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    const origenId = documento.documento_origen_id ?? documento.id;

    const versiones = await this.prisma.postulanteDocumento.findMany({
      where: {
        OR: [{ id: origenId }, { documento_origen_id: origenId }],
      },
      include: {
        tipo_documento_empleado: {
          select: { id: true, codigo: true, nombre: true },
        },
        subido_por: {
          select: { id: true, email: true, nombre_completo: true },
        },
        eliminado_por: {
          select: { id: true, email: true, nombre_completo: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    return versiones.map((v) => ({
      ...v,
      archivo_url: v.archivo_url
        ? this.uploadsService.getFileUrl(v.archivo_url)
        : null,
    }));
  }

  async deleteDocumento(
    documentoId: number,
    postulanteId: number,
    postulante: Postulante,
    usuarioId?: number,
    motivo?: string,
  ) {
    if (postulante.empleado_id) {
      throw new BadRequestException(
        'No se pueden eliminar documentos de un postulante ya convertido a empleado',
      );
    }

    const documento = await this.prisma.postulanteDocumento.findFirst({
      where: { id: documentoId, postulante_id: postulanteId, eliminado: false },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Soft delete: marcar toda la cadena de versiones como eliminada
    const origenId = documento.documento_origen_id ?? documento.id;
    await this.prisma.postulanteDocumento.updateMany({
      where: {
        OR: [{ id: origenId }, { documento_origen_id: origenId }],
        eliminado: false,
      },
      data: {
        eliminado: true,
        eliminado_en: ahoraPeru().toJSDate(),
        eliminado_por_id: usuarioId ?? null,
        motivo_eliminacion: motivo || null,
      },
    });

    // NO se elimina el archivo físico - se mantiene para trazabilidad

    return { success: true, message: 'Documento eliminado correctamente' };
  }
}
