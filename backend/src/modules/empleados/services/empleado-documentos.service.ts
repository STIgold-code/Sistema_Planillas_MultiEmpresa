import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { hasPermission } from '../../../common/constants/permissions';
import {
  EstadoDocumentosFilter,
  DIAS_POR_VENCER_DOCUMENTO,
} from '../../../common/constants/business-rules';
import { UploadsService } from '../../uploads/uploads.service';
import { AuthenticatedUser } from '../../../common/types/auth.types';
import { AddDocumentoDto } from '../dto';
import { Prisma, EstadoDocumentacion } from '@prisma/client';
import {
  ahoraPeru,
  sumarDiasPeru,
  parsearFechaISOenPeru,
  leerFechaPrisma,
  toDateOnly,
  fechaHoyPeru,
  fechaHoyPeruDate,
} from '../../../common/utils/datetime.util';

@Injectable()
export class EmpleadoDocumentosService {
  private readonly logger = new Logger(EmpleadoDocumentosService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  // ============================================================================
  // MÉTODOS PRIVADOS - HELPERS INTERNOS
  // ============================================================================

  /**
   * Helper privado: busca un empleado por id y empresaId.
   * Equivalente a EmpleadosService.findOne pero sin las relaciones completas.
   */
  private async findEmpleado(id: number, empresaId: number) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id, empresa_id: empresaId },
    });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return empleado;
  }

  /**
   * Construye el filtro de Prisma para documentos según el estado solicitado
   * Principio: Single Responsibility - solo construye el filtro, no ejecuta queries
   * Principio: Open/Closed - se puede extender agregando nuevos casos al enum
   */
  buildDocumentosFilter(
    estadoDocs: EstadoDocumentosFilter,
  ): Prisma.EmpleadoDocumentoListRelationFilter | null {
    const hoy = fechaHoyPeruDate();

    const baseFilter = {
      eliminado: false,
      es_version_vigente: true,
    };

    switch (estadoDocs) {
      case EstadoDocumentosFilter.VENCIDOS:
        return {
          some: {
            ...baseFilter,
            fecha_vencimiento: { lt: hoy },
          },
        };

      case EstadoDocumentosFilter.POR_VENCER: {
        const fechaLimite = new Date(hoy);
        fechaLimite.setDate(fechaLimite.getDate() + DIAS_POR_VENCER_DOCUMENTO);
        return {
          some: {
            ...baseFilter,
            fecha_vencimiento: {
              gte: hoy,
              lte: fechaLimite,
            },
          },
        };
      }

      case EstadoDocumentosFilter.INCOMPLETOS:
        // Empleados con estado_documentacion diferente a COMPLETO
        // Este caso se maneja diferente - retornamos null y el filtro
        // se aplica directamente en el where principal
        return null;

      default:
        return null;
    }
  }

  // ============================================================================
  // DOCUMENTOS - CRUD
  // ============================================================================

  /**
   * Crear documento de empleado con archivo (Híbrido)
   */
  async createDocumentoConArchivo(
    empleadoId: number,
    empresaId: number,
    file: Express.Multer.File,
    data: AddDocumentoDto,
    usuarioId?: number,
  ) {
    // Validar que el empleado existe y pertenece a la empresa del usuario
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException(
        'Empleado no encontrado o no pertenece a su empresa',
      );
    }

    // Validar fechas según tipo_vigencia del tipo de documento
    const tipoDocId = data.tipo_documento_empleado_id
      ? parseInt(data.tipo_documento_empleado_id)
      : null;

    let tipoDoc: Awaited<
      ReturnType<typeof this.prisma.tipoDocumentoEmpleado.findFirst>
    > = null;

    if (tipoDocId) {
      tipoDoc = await this.prisma.tipoDocumentoEmpleado.findFirst({
        where: { id: tipoDocId, empresa_id: empresaId },
      });

      if (!tipoDoc) {
        throw new BadRequestException(
          'Tipo de documento no válido o no pertenece a su empresa',
        );
      }

      if (tipoDoc.tipo_vigencia === 'SOLO_EMISION' && !data.fecha_emision) {
        throw new BadRequestException(
          `El tipo de documento "${tipoDoc.nombre}" requiere fecha de emisión`,
        );
      }

      if (tipoDoc.tipo_vigencia === 'CON_VENCIMIENTO') {
        if (!data.fecha_emision) {
          throw new BadRequestException(
            `El tipo de documento "${tipoDoc.nombre}" requiere fecha de emisión`,
          );
        }
        if (!data.fecha_vencimiento) {
          throw new BadRequestException(
            `El tipo de documento "${tipoDoc.nombre}" requiere fecha de vencimiento`,
          );
        }
      }

      // Validar que fecha_vencimiento > fecha_emision
      if (data.fecha_emision && data.fecha_vencimiento) {
        const emision = new Date(data.fecha_emision);
        const vencimiento = new Date(data.fecha_vencimiento);
        if (vencimiento <= emision) {
          throw new BadRequestException(
            'La fecha de vencimiento debe ser posterior a la fecha de emisión',
          );
        }
      }
    }

    // ====== LOGS DE SUBIDA ======
    this.logger.log('========================================');
    this.logger.log('INICIANDO SUBIDA DE DOCUMENTO');
    this.logger.log(`Archivo original: ${file.originalname}`);
    this.logger.log(`Tamano: ${(file.size / 1024).toFixed(2)} KB`);
    this.logger.log(`Tipo MIME: ${file.mimetype}`);
    this.logger.log(`Empleado ID: ${empleadoId}`);
    this.logger.log(
      `Modo: ${this.uploadsService.isUsingWasabi() ? 'WASABI S3' : 'LOCAL'}`,
    );
    this.logger.log('========================================');

    // Generar key y subir archivo
    const filename = this.uploadsService.generateFilename(
      'doc',
      file.originalname,
    );
    const key = this.uploadsService.generateKey(
      'documentos',
      empleadoId,
      filename,
    );

    this.logger.log(`Key generada: ${key}`);
    this.logger.log('Subiendo archivo...');

    const storedPath = await this.uploadsService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    this.logger.log(`Archivo subido exitosamente!`);
    this.logger.log(`Path almacenado: ${storedPath}`);

    // Crear registro en BD
    const documento = await this.prisma.empleadoDocumento.create({
      data: {
        empleado_id: empleadoId,
        tipo_documento_empleado_id: parseInt(
          data.tipo_documento_empleado_id ?? '',
        ),
        descripcion: data.descripcion,
        archivo_url: storedPath, // Guardar PATH, no URL completa
        archivo_nombre: file.originalname,
        fecha_emision: data.fecha_emision
          ? parsearFechaISOenPeru(data.fecha_emision)
          : null,
        fecha_vencimiento: data.fecha_vencimiento
          ? parsearFechaISOenPeru(data.fecha_vencimiento)
          : null,
        origen: tipoDoc?.aplica_seleccion ? 'SELECCION' : 'RRHH',
        subido_por_id: usuarioId ?? null,
      },
    });

    // Actualizar estado de documentación
    await this.actualizarEstadoDocumentacion(empleadoId, empresaId);

    return {
      ...documento,
      archivo_url_completa: this.uploadsService.getFileUrl(storedPath),
    };
  }

  /**
   * Soft delete de documento - marca como eliminado sin borrar archivo físico ni registro
   * Mantiene trazabilidad completa: quién eliminó, cuándo y por qué
   */
  async deleteDocumentoConArchivo(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    user?: AuthenticatedUser,
    motivo?: string,
  ) {
    const documento = await this.prisma.empleadoDocumento.findFirst({
      where: { id: documentoId, empleado_id: empleadoId, eliminado: false },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Protección por origen: documentos de SELECCION requieren permiso especial
    const esOrigenSeleccion = documento.origen === 'SELECCION';

    if (esOrigenSeleccion) {
      const userPermisos: string[] = user?.rol?.permisos || [];
      if (!hasPermission(userPermisos, 'documentos_seleccion:editar')) {
        throw new ForbiddenException(
          'No tiene permiso para eliminar documentos provenientes del proceso de selección',
        );
      }
    }

    const usuarioId = user?.id ?? null;

    // Soft delete: marcar como eliminado en transacción
    await this.prisma.$transaction(async (tx) => {
      // Marcar documento (y todas sus versiones) como eliminados
      const origenId = documento.documento_origen_id ?? documento.id;
      await tx.empleadoDocumento.updateMany({
        where: {
          OR: [{ id: origenId }, { documento_origen_id: origenId }],
          eliminado: false,
        },
        data: {
          eliminado: true,
          eliminado_en: ahoraPeru().toJSDate(),
          eliminado_por_id: usuarioId,
          motivo_eliminacion: motivo || null,
        },
      });

      // Recalcular estado de documentación (solo considera vigentes y no eliminados)
      const tiposObligatorios = await tx.tipoDocumentoEmpleado.findMany({
        where: { empresa_id: empresaId, es_obligatorio: true, activo: true },
      });

      if (tiposObligatorios.length === 0) {
        await tx.empleado.update({
          where: { id: empleadoId },
          data: { estado_documentacion: 'COMPLETO' },
        });
      } else {
        const documentosRestantes = await tx.empleadoDocumento.findMany({
          where: {
            empleado_id: empleadoId,
            es_version_vigente: true,
            eliminado: false,
          },
        });

        let nuevoEstado: EstadoDocumentacion = 'COMPLETO';
        if (documentosRestantes.length === 0) {
          nuevoEstado = 'PENDIENTE';
        } else {
          const hoyStr = fechaHoyPeru();
          for (const tipo of tiposObligatorios) {
            const doc = documentosRestantes.find(
              (d) => d.tipo_documento_empleado_id === tipo.id,
            );
            if (!doc) {
              nuevoEstado = 'INCOMPLETO';
              break;
            } else if (
              doc.fecha_vencimiento &&
              toDateOnly(doc.fecha_vencimiento) < hoyStr
            ) {
              nuevoEstado = 'PENDIENTE';
              break;
            }
          }
        }

        await tx.empleado.update({
          where: { id: empleadoId },
          data: { estado_documentacion: nuevoEstado },
        });
      }
    });

    // NO se elimina el archivo físico - se mantiene para trazabilidad

    return { success: true };
  }

  /**
   * Obtiene los documentos subidos vigentes de un empleado (solo versión actual, no eliminados)
   */
  async getDocumentos(empleadoId: number, empresaId: number) {
    // Verificar que el empleado existe y pertenece a la empresa
    await this.findEmpleado(empleadoId, empresaId);

    const documentos = await this.prisma.empleadoDocumento.findMany({
      where: {
        empleado_id: empleadoId,
        es_version_vigente: true,
        eliminado: false,
      },
      include: {
        tipo_documento_empleado: {
          select: { id: true, codigo: true, nombre: true },
        },
        subido_por: {
          select: { id: true, email: true, nombre_completo: true },
        },
      },
      orderBy: { fecha_carga: 'desc' },
    });

    // Contar versiones por origen en UNA sola query (evita N+1)
    const origenIds = [
      ...new Set(documentos.map((doc) => doc.documento_origen_id ?? doc.id)),
    ];

    const countMap = new Map<number, number>();

    if (origenIds.length > 0) {
      const versionCounts = await this.prisma.$queryRaw<
        Array<{ origen_id: number; total: bigint }>
      >`
        SELECT
          COALESCE(documento_origen_id, id) AS origen_id,
          COUNT(*) AS total
        FROM empleados_documentos
        WHERE eliminado = false
          AND COALESCE(documento_origen_id, id) IN (${Prisma.join(origenIds)})
        GROUP BY COALESCE(documento_origen_id, id)
      `;

      for (const v of versionCounts) {
        countMap.set(Number(v.origen_id), Number(v.total));
      }
    }

    return documentos.map((doc) => {
      const origenId = doc.documento_origen_id ?? doc.id;
      return {
        ...doc,
        archivo_url: doc.archivo_url
          ? this.uploadsService.getFileUrl(doc.archivo_url)
          : null,
        total_versiones: countMap.get(origenId) || 1,
      };
    });
  }

  async addDocumento(
    empleadoId: number,
    empresaId: number,
    data: AddDocumentoDto,
  ) {
    await this.findEmpleado(empleadoId, empresaId);

    const documento = await this.prisma.empleadoDocumento.create({
      data: {
        empleado_id: empleadoId,
        tipo_documento_empleado_id: parseInt(
          data.tipo_documento_empleado_id ?? '',
        ),
        descripcion: data.descripcion,
        fecha_emision: data.fecha_emision
          ? parsearFechaISOenPeru(data.fecha_emision)
          : null,
        fecha_vencimiento: data.fecha_vencimiento
          ? parsearFechaISOenPeru(data.fecha_vencimiento)
          : null,
      } as Prisma.EmpleadoDocumentoUncheckedCreateInput,
    });

    // Actualizar estado de documentación del empleado
    await this.actualizarEstadoDocumentacion(empleadoId, empresaId);

    return documento;
  }

  async removeDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    user?: AuthenticatedUser,
    motivo?: string,
  ) {
    return this.deleteDocumentoConArchivo(
      documentoId,
      empleadoId,
      empresaId,
      user,
      motivo,
    );
  }

  /**
   * Crea una nueva versión de un documento existente
   * El documento anterior queda como versión no vigente (trazabilidad completa)
   */
  async crearNuevaVersionDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
    file: Express.Multer.File,
    motivo: string,
    usuarioId: number,
  ) {
    const documentoAnterior = await this.prisma.empleadoDocumento.findFirst({
      where: {
        id: documentoId,
        empleado_id: empleadoId,
        es_version_vigente: true,
        eliminado: false,
      },
    });

    if (!documentoAnterior) {
      throw new NotFoundException(
        'Documento no encontrado o ya no es la versión vigente',
      );
    }

    // Verificar que el empleado pertenece a la empresa
    await this.findEmpleado(empleadoId, empresaId);

    // El origen de la cadena es el primer documento (v1)
    const origenId =
      documentoAnterior.documento_origen_id ?? documentoAnterior.id;

    // Calcular número de versión siguiente (incluye eliminados para mantener secuencia)
    const versionActual = await this.prisma.empleadoDocumento.count({
      where: {
        OR: [{ id: origenId }, { documento_origen_id: origenId }],
      },
    });

    // Subir nuevo archivo a Wasabi/Local
    const filename = this.uploadsService.generateFilename(
      'doc',
      file.originalname,
    );
    const key = this.uploadsService.generateKey(
      'documentos',
      empleadoId,
      filename,
    );

    const storedPath = await this.uploadsService.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    // Transacción: desactivar versión anterior + crear nueva versión
    let nuevoDocumento;
    try {
      nuevoDocumento = await this.prisma.$transaction(async (tx) => {
        // Marcar versión anterior como no vigente
        await tx.empleadoDocumento.update({
          where: { id: documentoAnterior.id },
          data: { es_version_vigente: false },
        });

        // Crear nueva versión
        const nuevo = await tx.empleadoDocumento.create({
          data: {
            empleado_id: empleadoId,
            tipo_documento_empleado_id:
              documentoAnterior.tipo_documento_empleado_id,
            descripcion: documentoAnterior.descripcion,
            archivo_url: storedPath,
            archivo_nombre: file.originalname,
            fecha_emision: documentoAnterior.fecha_emision,
            fecha_vencimiento: documentoAnterior.fecha_vencimiento,
            origen: documentoAnterior.origen,
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
      // Limpiar archivo subido si la transacción falló
      try {
        await this.uploadsService.deleteFileHybrid(storedPath);
      } catch (cleanupError: unknown) {
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

    // Actualizar estado de documentación
    await this.actualizarEstadoDocumentacion(empleadoId, empresaId);

    this.logger.log(
      `Nueva versión (v${nuevoDocumento.version}) creada para documento #${documentoAnterior.id} del empleado #${empleadoId}`,
    );

    return {
      ...nuevoDocumento,
      archivo_url: this.uploadsService.getFileUrl(storedPath),
    };
  }

  /**
   * Obtiene el historial completo de versiones de un documento
   */
  async getHistorialDocumento(
    documentoId: number,
    empleadoId: number,
    empresaId: number,
  ) {
    await this.findEmpleado(empleadoId, empresaId);

    // Buscar el documento (puede ser cualquier versión)
    const documento = await this.prisma.empleadoDocumento.findFirst({
      where: { id: documentoId, empleado_id: empleadoId },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Determinar el ID raíz de la cadena
    const origenId = documento.documento_origen_id ?? documento.id;

    // Obtener todas las versiones de la cadena (incluyendo eliminadas)
    const versiones = await this.prisma.empleadoDocumento.findMany({
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

  // ==================== GESTIÓN DE ESTADO DE DOCUMENTACIÓN ====================

  /**
   * Obtiene la lista de documentos obligatorios faltantes para un empleado
   */
  async getDocumentosFaltantes(
    empleadoId: number,
    empresaId: number,
  ): Promise<string[]> {
    const tiposObligatorios = await this.prisma.tipoDocumentoEmpleado.findMany({
      where: {
        empresa_id: empresaId,
        es_obligatorio: true,
        activo: true,
      },
    });

    if (tiposObligatorios.length === 0) {
      return [];
    }

    const documentosEmpleado = await this.prisma.empleadoDocumento.findMany({
      where: {
        empleado_id: empleadoId,
        es_version_vigente: true,
        eliminado: false,
      },
    });

    const hoyStr = fechaHoyPeru();

    const faltantes: string[] = [];

    for (const tipoObligatorio of tiposObligatorios) {
      const docEncontrado = documentosEmpleado.find(
        (d) => d.tipo_documento_empleado_id === tipoObligatorio.id,
      );

      if (!docEncontrado) {
        faltantes.push(tipoObligatorio.nombre);
      } else if (docEncontrado.fecha_vencimiento) {
        const fechaVencStr = toDateOnly(docEncontrado.fecha_vencimiento);
        if (fechaVencStr < hoyStr) {
          faltantes.push(`${tipoObligatorio.nombre} (vencido)`);
        }
      }
    }

    return faltantes;
  }

  /**
   * Valida que un empleado pueda pasar a estado ACTIVO
   * Lanza excepción si no tiene todos los documentos obligatorios
   */
  async validarPuedeEstarActivo(
    empleadoId: number,
    empresaId: number,
  ): Promise<void> {
    const faltantes = await this.getDocumentosFaltantes(empleadoId, empresaId);

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se puede activar al empleado. Documentos faltantes o vencidos: ${faltantes.join(', ')}`,
      );
    }
  }

  /**
   * Calcula y actualiza el estado de documentación de un empleado
   * basándose en los documentos obligatorios configurados
   */
  async actualizarEstadoDocumentacion(
    empleadoId: number,
    empresaId: number,
  ): Promise<EstadoDocumentacion> {
    // Obtener todos los tipos de documento obligatorios
    const tiposObligatorios = await this.prisma.tipoDocumentoEmpleado.findMany({
      where: {
        empresa_id: empresaId,
        es_obligatorio: true,
        activo: true,
      },
    });

    // Si no hay documentos obligatorios configurados, el estado es COMPLETO
    if (tiposObligatorios.length === 0) {
      await this.prisma.empleado.update({
        where: { id: empleadoId },
        data: { estado_documentacion: EstadoDocumentacion.COMPLETO },
      });
      return EstadoDocumentacion.COMPLETO;
    }

    // Obtener documentos vigentes y no eliminados del empleado
    const documentosEmpleado = await this.prisma.empleadoDocumento.findMany({
      where: {
        empleado_id: empleadoId,
        es_version_vigente: true,
        eliminado: false,
      },
      include: { tipo_documento_empleado: true },
    });

    // Si no tiene ningún documento vigente, está PENDIENTE
    if (documentosEmpleado.length === 0) {
      await this.prisma.empleado.update({
        where: { id: empleadoId },
        data: { estado_documentacion: EstadoDocumentacion.PENDIENTE },
      });
      return EstadoDocumentacion.PENDIENTE;
    }

    const hoyStr = fechaHoyPeru();

    let tieneVencidos = false;
    let faltanObligatorios = false;

    for (const tipoObligatorio of tiposObligatorios) {
      // Buscar si el empleado tiene este documento
      const docEncontrado = documentosEmpleado.find(
        (d) => d.tipo_documento_empleado_id === tipoObligatorio.id,
      );

      if (!docEncontrado) {
        faltanObligatorios = true;
      } else if (docEncontrado.fecha_vencimiento) {
        // Verificar si está vencido (comparación de fechas date-only)
        const fechaVencStr = toDateOnly(docEncontrado.fecha_vencimiento);
        if (fechaVencStr < hoyStr) {
          tieneVencidos = true;
        }
      }
    }

    let nuevoEstado: EstadoDocumentacion;
    if (tieneVencidos) {
      nuevoEstado = EstadoDocumentacion.VENCIDO;
    } else if (faltanObligatorios) {
      nuevoEstado = EstadoDocumentacion.INCOMPLETO;
    } else {
      nuevoEstado = EstadoDocumentacion.COMPLETO;
    }

    await this.prisma.empleado.update({
      where: { id: empleadoId },
      data: { estado_documentacion: nuevoEstado },
    });

    return nuevoEstado;
  }

  /**
   * Recalcula el estado de documentación de todos los empleados de una empresa
   * Útil para ejecutar después de cambiar la configuración de documentos obligatorios
   * Optimizado para evitar N+1 queries
   */
  async recalcularEstadoDocumentacionTodos(
    empresaId: number,
  ): Promise<{ actualizados: number }> {
    // Obtener todos los datos necesarios en pocas queries
    const [empleados, tiposObligatorios, todosDocumentos] = await Promise.all([
      this.prisma.empleado.findMany({
        where: { empresa_id: empresaId },
        select: { id: true },
      }),
      this.prisma.tipoDocumentoEmpleado.findMany({
        where: { empresa_id: empresaId, es_obligatorio: true, activo: true },
      }),
      this.prisma.empleadoDocumento.findMany({
        where: {
          empleado: { empresa_id: empresaId },
          es_version_vigente: true,
          eliminado: false,
        },
        select: {
          empleado_id: true,
          tipo_documento_empleado_id: true,
          fecha_vencimiento: true,
        },
      }),
    ]);

    // Si no hay tipos obligatorios, todos están COMPLETO
    if (tiposObligatorios.length === 0) {
      await this.prisma.empleado.updateMany({
        where: { empresa_id: empresaId },
        data: { estado_documentacion: 'COMPLETO' },
      });
      return { actualizados: empleados.length };
    }

    const hoyStr = fechaHoyPeru();

    // Calcular estado para cada empleado en memoria
    const updates: { id: number; estado: EstadoDocumentacion }[] = [];

    for (const empleado of empleados) {
      const docsEmpleado = todosDocumentos.filter(
        (d) => d.empleado_id === empleado.id,
      );

      if (docsEmpleado.length === 0) {
        updates.push({ id: empleado.id, estado: 'PENDIENTE' });
        continue;
      }

      let tieneVencidos = false;
      let faltanObligatorios = false;

      for (const tipo of tiposObligatorios) {
        const doc = docsEmpleado.find(
          (d) => d.tipo_documento_empleado_id === tipo.id,
        );
        if (!doc) {
          faltanObligatorios = true;
        } else if (doc.fecha_vencimiento) {
          const fechaVencStr = toDateOnly(doc.fecha_vencimiento);
          if (fechaVencStr < hoyStr) {
            tieneVencidos = true;
          }
        }
      }

      let nuevoEstado: EstadoDocumentacion;
      if (tieneVencidos) {
        nuevoEstado = 'PENDIENTE';
      } else if (faltanObligatorios) {
        nuevoEstado = 'INCOMPLETO';
      } else {
        nuevoEstado = 'COMPLETO';
      }

      updates.push({ id: empleado.id, estado: nuevoEstado });
    }

    // Batch update con transacción
    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.empleado.update({
          where: { id: u.id },
          data: { estado_documentacion: u.estado },
        }),
      ),
    );

    return { actualizados: empleados.length };
  }

  /**
   * Obtiene documentos próximos a vencer o ya vencidos
   */
  async getDocumentosVencimientoProximo(
    empresaId: number,
    diasAnticipacion: number = 30,
  ) {
    const hoyStr = fechaHoyPeru();
    const fechaLimite = sumarDiasPeru(fechaHoyPeruDate(), diasAnticipacion);

    const documentos = await this.prisma.empleadoDocumento.findMany({
      where: {
        empleado: { empresa_id: empresaId },
        fecha_vencimiento: { lte: fechaLimite },
        tipo_documento_empleado: { es_obligatorio: true },
        es_version_vigente: true,
        eliminado: false,
      },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            area: { select: { nombre: true } },
          },
        },
        tipo_documento_empleado: { select: { nombre: true } },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    const hoyUtc = leerFechaPrisma(hoyStr);

    return documentos.map((doc) => ({
      ...doc,
      estado:
        doc.fecha_vencimiento && toDateOnly(doc.fecha_vencimiento) < hoyStr
          ? 'PENDIENTE'
          : 'POR_VENCER',
      dias_restantes: doc.fecha_vencimiento
        ? Math.round(
            leerFechaPrisma(doc.fecha_vencimiento).diff(hoyUtc, 'days').days,
          )
        : null,
    }));
  }

  /**
   * Dashboard de cumplimiento de documentación
   */
  async getDashboardDocumentacion(empresaId: number) {
    const [
      totalEmpleados,
      empleadosPorEstado,
      documentosVencidos,
      documentosPorVencer,
    ] = await Promise.all([
      this.prisma.empleado.count({
        where: { empresa_id: empresaId, estado: 'ACTIVO' },
      }),
      this.prisma.empleado.groupBy({
        by: ['estado_documentacion'],
        where: { empresa_id: empresaId, estado: 'ACTIVO' },
        _count: true,
      }),
      this.getDocumentosVencimientoProximo(empresaId, 0), // Vencidos (días <= 0)
      this.getDocumentosVencimientoProximo(empresaId, 30), // Por vencer en 30 días
    ]);

    const vencidosCount = documentosVencidos.filter(
      (d) => d.estado === 'PENDIENTE',
    ).length;
    const porVencerCount = documentosPorVencer.filter(
      (d) => d.estado === 'POR_VENCER',
    ).length;

    const estadisticas = {
      COMPLETO: 0,
      INCOMPLETO: 0,
      PENDIENTE: 0,
      VENCIDO: 0,
    };

    empleadosPorEstado.forEach((e) => {
      estadisticas[e.estado_documentacion] = e._count;
    });

    const porcentajeCumplimiento =
      totalEmpleados > 0
        ? Math.round((estadisticas.COMPLETO / totalEmpleados) * 100)
        : 0;

    return {
      total_empleados: totalEmpleados,
      estadisticas,
      porcentaje_cumplimiento: porcentajeCumplimiento,
      documentos_vencidos: vencidosCount,
      documentos_por_vencer_30_dias: porVencerCount,
      alertas: documentosPorVencer.slice(0, 10), // Top 10 más urgentes
    };
  }
}
