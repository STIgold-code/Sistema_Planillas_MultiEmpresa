import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { BancoDocumentosGeneracionService } from './banco-documentos-generacion.service';
import {
  CreatePlantillaDocumentoDto,
  UpdatePlantillaDocumentoDto,
  GenerarDocumentoDto,
  ActualizarEstadoDocumentoDto,
  EstadoDocumentoGenerado,
  GenerarMasivoDto,
  CategoriaDocumento,
  TipoArchivoPlantilla,
} from './dto';
import { existsSync, createReadStream } from 'fs';
import { join, resolve } from 'path';
import { UPLOADS_DIR } from '../uploads/uploads.config';
import { Prisma } from '@prisma/client';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { obtenerMensajeError } from '../../common/utils/error.util';

// Transiciones de estado válidas
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  PENDIENTE: ['FIRMADO', 'RECHAZADO'],
  FIRMADO: [], // Estado terminal - no se puede cambiar
  RECHAZADO: ['PENDIENTE'], // Se puede regenerar
};

@Injectable()
export class BancoDocumentosService {
  private readonly logger = new Logger(BancoDocumentosService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private generacionService: BancoDocumentosGeneracionService,
  ) {}

  // ==================== PLANTILLAS ====================

  async findAllPlantillas(empresaId: number, includeInactive = false) {
    const where: Prisma.PlantillaDocumentoWhereInput = {
      empresa_id: empresaId,
    };
    if (!includeInactive) {
      where.activo = true;
    }

    return this.prisma.plantillaDocumento.findMany({
      where,
      orderBy: [{ categoria: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        requiere_firma: true,
        es_obligatorio: true,
        orden: true,
        activo: true,
        created_at: true,
        updated_at: true,
        // contenido excluido para optimizar - solo se carga en findOnePlantilla
        _count: { select: { documentos_generados: true } },
      },
    });
  }

  async findOnePlantilla(id: number, empresaId: number) {
    const plantilla = await this.prisma.plantillaDocumento.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        _count: { select: { documentos_generados: true } },
      },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla de documento no encontrada');
    }

    return plantilla;
  }

  async createPlantilla(
    dto: CreatePlantillaDocumentoDto,
    file: Express.Multer.File,
    empresaId: number,
  ) {
    if (dto.tipo_archivo !== TipoArchivoPlantilla.HTML && !file) {
      throw new BadRequestException(
        `Las plantillas de tipo ${dto.tipo_archivo} requieren subir un archivo base`,
      );
    }

    let archivoUrl: string | null = null;
    let variables = dto.variables;

    if (file) {
      try {
        const extraction = await this.extractVariables(file, false);
        if (!variables) {
          variables = extraction.variables;
        }
      } catch (error: unknown) {
        this.logger.warn(
          `No se pudieron extraer variables del archivo: ${obtenerMensajeError(error)}`,
        );
      }

      const uploadResult = await this.uploadsService.processUpload(
        file,
        'plantillas_banco',
      );
      archivoUrl = uploadResult.file.url;
    }

    try {
      return await this.prisma.plantillaDocumento.create({
        data: {
          ...dto,
          variables: variables as Prisma.InputJsonValue,
          archivo_base_url: archivoUrl,
          empresa_id: empresaId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una plantilla con ese código');
      }
      throw error;
    }
  }

  async updatePlantilla(
    id: number,
    dto: UpdatePlantillaDocumentoDto,
    file: Express.Multer.File,
    empresaId: number,
  ) {
    const plantillaActual = await this.findOnePlantilla(id, empresaId);

    let archivoUrl = plantillaActual.archivo_base_url;
    let variables = dto.variables;

    if (file) {
      try {
        const extraction = await this.extractVariables(file, false);
        if (!variables) {
          variables = extraction.variables;
        }
      } catch (error: unknown) {
        this.logger.warn(
          `No se pudieron extraer variables del archivo: ${obtenerMensajeError(error)}`,
        );
      }

      const uploadResult = await this.uploadsService.processUpload(
        file,
        'plantillas_banco',
      );
      archivoUrl = uploadResult.file.url;
    }

    try {
      const updateData: Prisma.PlantillaDocumentoUpdateInput = {
        ...dto,
        archivo_base_url: archivoUrl,
      };
      if (variables) {
        updateData.variables = variables as Prisma.InputJsonValue;
      }

      return await this.prisma.plantillaDocumento.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una plantilla con ese código');
      }
      throw error;
    }
  }

  async removePlantilla(id: number, empresaId: number) {
    await this.findOnePlantilla(id, empresaId);

    // Verificar si tiene documentos generados
    const count = await this.prisma.documentoGenerado.count({
      where: { plantilla_documento_id: id },
    });

    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${count} documento(s) generado(s) con esta plantilla. Desactívela en su lugar.`,
      );
    }

    await this.prisma.plantillaDocumento.delete({ where: { id } });
    return { message: 'Plantilla eliminada correctamente' };
  }

  async togglePlantilla(id: number, empresaId: number) {
    const plantilla = await this.findOnePlantilla(id, empresaId);
    return this.prisma.plantillaDocumento.update({
      where: { id },
      data: { activo: !plantilla.activo },
    });
  }

  // Delegation to BancoDocumentosGeneracionService

  async extractVariables(
    file: Express.Multer.File,
    cleanup: boolean = true,
  ): Promise<{ variables: string[] }> {
    return this.generacionService.extractVariables(file, cleanup);
  }

  getVariablesDisponibles() {
    return this.generacionService.getVariablesDisponibles();
  }

  // ==================== DOCUMENTOS GENERADOS ====================

  async generarDocumento(
    dto: GenerarDocumentoDto,
    empresaId: number,
    usuarioId: number,
  ) {
    return this.generacionService.generarDocumento(dto, empresaId, usuarioId);
  }
  async findDocumentosEmpleado(empleadoId: number, empresaId: number) {
    // Verificar que el empleado pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return this.prisma.documentoGenerado.findMany({
      where: { empleado_id: empleadoId },
      include: {
        plantilla_documento: {
          select: { codigo: true, nombre: true, categoria: true },
        },
      },
      orderBy: { fecha_generacion: 'desc' },
    });
  }

  async findOneDocumento(id: number, empresaId: number) {
    // Filtrar por empresa_id directamente en la query para evitar leak de información
    const documento = await this.prisma.documentoGenerado.findFirst({
      where: {
        id,
        empleado: { empresa_id: empresaId },
      },
      include: {
        plantilla_documento: true,
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            empresa_id: true,
          },
        },
      },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    return documento;
  }

  async actualizarEstadoDocumento(
    id: number,
    dto: ActualizarEstadoDocumentoDto,
    empresaId: number,
    usuarioId: number,
  ) {
    const documento = await this.findOneDocumento(id, empresaId);

    // Validar transición de estado
    const transicionesPermitidas = TRANSICIONES_VALIDAS[documento.estado] || [];
    if (!transicionesPermitidas.includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${documento.estado} a ${dto.estado}. Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna'}`,
      );
    }

    // Requerir observaciones para rechazo
    if (
      dto.estado === EstadoDocumentoGenerado.RECHAZADO &&
      !dto.observaciones
    ) {
      throw new BadRequestException(
        'Debe indicar el motivo del rechazo en las observaciones',
      );
    }

    const updateData: Prisma.DocumentoGeneradoUpdateInput = {
      estado: dto.estado,
      observaciones: dto.observaciones,
    };

    if (dto.estado === EstadoDocumentoGenerado.FIRMADO) {
      updateData.fecha_firma = ahoraPeru().toJSDate();
    }

    const documentoActualizado = await this.prisma.documentoGenerado.update({
      where: { id },
      data: updateData,
      include: {
        plantilla_documento: {
          select: { codigo: true, nombre: true },
        },
      },
    });

    // Registrar auditoría
    await this.registrarAuditoria(
      'documentos_generados',
      id,
      'UPDATE',
      { estado: documento.estado },
      { estado: dto.estado, observaciones: dto.observaciones },
      usuarioId,
    );

    return documentoActualizado;
  }

  async eliminarDocumento(id: number, empresaId: number) {
    await this.findOneDocumento(id, empresaId);

    await this.prisma.documentoGenerado.delete({ where: { id } });
    return { message: 'Documento eliminado correctamente' };
  }

  async subirDocumentoFirmado(
    id: number,
    file: Express.Multer.File,
    empresaId: number,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado un archivo');
    }

    // Verificar que el documento existe y pertenece a la empresa
    const documento = await this.findOneDocumento(id, empresaId);

    // Verificar que el documento está en estado PENDIENTE
    if (documento.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `Solo se pueden subir archivos para documentos en estado PENDIENTE. Estado actual: ${documento.estado}`,
      );
    }

    // Procesar upload con UploadsService (maneja Wasabi o local)
    const uploadResult = await this.uploadsService.processUpload(
      file,
      'documentos',
    );

    // Actualizar el documento con la URL del archivo firmado
    return this.prisma.documentoGenerado.update({
      where: { id },
      data: {
        archivo_firmado_url: uploadResult.file.url,
        estado: 'FIRMADO',
        fecha_firma: ahoraPeru().toJSDate(),
      },
      include: {
        plantilla_documento: {
          select: { codigo: true, nombre: true },
        },
      },
    });
  }

  // ==================== REPORTES ====================

  async getDocumentosPendientesPorEmpleado(
    empresaId: number,
    page = 1,
    limit = 50,
  ) {
    // Obtener todas las plantillas obligatorias
    const plantillasObligatorias =
      await this.prisma.plantillaDocumento.findMany({
        where: { empresa_id: empresaId, es_obligatorio: true, activo: true },
        select: { id: true, codigo: true, nombre: true },
      });

    if (plantillasObligatorias.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Contar total para paginación
    const total = await this.prisma.empleado.count({
      where: { empresa_id: empresaId, estado: 'ACTIVO' },
    });

    // Obtener empleados activos con sus documentos generados (paginado)
    const empleados = await this.prisma.empleado.findMany({
      where: { empresa_id: empresaId, estado: 'ACTIVO' },
      select: {
        id: true,
        numero_documento: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        documentos_generados: {
          where: {
            plantilla_documento_id: {
              in: plantillasObligatorias.map((p) => p.id),
            },
          },
          select: {
            plantilla_documento_id: true,
            estado: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { apellido_paterno: 'asc' },
    });

    // Calcular documentos pendientes por empleado
    const data = empleados.map((empleado) => {
      const documentosGeneradosIds = empleado.documentos_generados.map(
        (d) => d.plantilla_documento_id,
      );
      const documentosFirmadosIds = empleado.documentos_generados
        .filter((d) => d.estado === 'FIRMADO')
        .map((d) => d.plantilla_documento_id);

      const faltantes = plantillasObligatorias.filter(
        (p) => !documentosGeneradosIds.includes(p.id),
      );
      const pendientesFirma = plantillasObligatorias.filter(
        (p) =>
          documentosGeneradosIds.includes(p.id) &&
          !documentosFirmadosIds.includes(p.id),
      );

      return {
        empleado_id: empleado.id,
        numero_documento: empleado.numero_documento,
        nombre_completo: `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`,
        total_obligatorios: plantillasObligatorias.length,
        firmados: documentosFirmadosIds.length,
        pendientes_firma: pendientesFirma.length,
        sin_generar: faltantes.length,
        faltantes: faltantes.map((f) => f.nombre),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== GENERACIÓN MASIVA ====================

  async generarDocumentosMasivo(
    dto: GenerarMasivoDto,
    empresaId: number,
    usuarioId: number,
  ) {
    const categoria = dto.categoria || CategoriaDocumento.INGRESO;

    // Verificar que el empleado existe y pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      include: {
        area: true,
        cargo: true,
        sede: { include: { cliente: true } },
        distrito: {
          include: { provincia: { include: { departamento: true } } },
        },
        regimen_pensionario: true,
        banco_haberes: true,
        banco_cts: true,
        empresa: true,
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Validar estado del empleado
    this.generacionService.validarEstadoEmpleadoParaCategoria(
      empleado.estado,
      categoria,
    );

    // Obtener plantillas activas de la categoría
    const plantillas = await this.prisma.plantillaDocumento.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
        categoria: categoria,
      },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });

    if (plantillas.length === 0) {
      throw new BadRequestException(
        `No hay plantillas activas de categoría ${categoria}`,
      );
    }

    // Obtener documentos ya generados para este empleado (no rechazados)
    const documentosExistentes = await this.prisma.documentoGenerado.findMany({
      where: {
        empleado_id: dto.empleado_id,
        plantilla_documento_id: { in: plantillas.map((p) => p.id) },
        estado: { not: 'RECHAZADO' },
      },
      select: { plantilla_documento_id: true },
    });

    const plantillasYaGeneradas = new Set(
      documentosExistentes.map((d) => d.plantilla_documento_id),
    );

    // Filtrar plantillas que no tienen documento generado
    const plantillasPendientes = plantillas.filter(
      (p) => !plantillasYaGeneradas.has(p.id),
    );

    if (plantillasPendientes.length === 0) {
      return {
        generados: 0,
        mensaje: 'Todos los documentos de esta categoría ya fueron generados',
        documentos: [],
      };
    }

    // Generar documentos en una transacción para garantizar atomicidad
    const documentosGenerados = await this.prisma.$transaction(async (tx) => {
      const documentosData = plantillasPendientes.map((plantilla) => ({
        empleado_id: dto.empleado_id,
        plantilla_documento_id: plantilla.id,
        contenido_generado: this.generacionService.reemplazarVariablesPublico(
          plantilla.contenido,
          empleado,
        ),
        estado: 'PENDIENTE' as const,
        generado_por: usuarioId,
      }));

      // Crear todos los documentos en batch
      await tx.documentoGenerado.createMany({
        data: documentosData,
      });

      // Recuperar los documentos creados con sus relaciones
      return tx.documentoGenerado.findMany({
        where: {
          empleado_id: dto.empleado_id,
          plantilla_documento_id: { in: plantillasPendientes.map((p) => p.id) },
          generado_por: usuarioId,
        },
        include: {
          plantilla_documento: {
            select: { codigo: true, nombre: true, categoria: true },
          },
        },
        orderBy: { id: 'desc' },
        take: plantillasPendientes.length,
      });
    });

    return {
      generados: documentosGenerados.length,
      mensaje: `Se generaron ${documentosGenerados.length} documento(s)`,
      documentos: documentosGenerados,
    };
  }

  async getContenidosPdfEmpleado(
    empleadoId: number,
    empresaId: number,
    categoria?: CategoriaDocumento,
  ) {
    // Verificar que el empleado pertenece a la empresa
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
      select: {
        id: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        numero_documento: true,
      },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const where: Prisma.DocumentoGeneradoWhereInput = {
      empleado_id: empleadoId,
    };
    if (categoria) {
      where.plantilla_documento = { categoria };
    }

    const documentos = await this.prisma.documentoGenerado.findMany({
      where,
      include: {
        plantilla_documento: {
          select: { codigo: true, nombre: true, categoria: true, orden: true },
        },
      },
      orderBy: [
        { plantilla_documento: { categoria: 'asc' } },
        { plantilla_documento: { orden: 'asc' } },
        { plantilla_documento: { nombre: 'asc' } },
      ],
    });

    return {
      empleado: {
        id: empleado.id,
        nombre_completo: `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`,
        numero_documento: empleado.numero_documento,
      },
      documentos: documentos.map((d) => ({
        id: d.id,
        nombre: d.plantilla_documento.nombre,
        codigo: d.plantilla_documento.codigo,
        categoria: d.plantilla_documento.categoria,
        contenido: d.contenido_generado,
      })),
    };
  }

  // ==================== DESCARGA DE DOCUMENTOS ====================

  /**
   * Obtiene la información del archivo para descarga
   * Retorna los datos necesarios para servir el archivo
   */
  async getDocumentoParaDescarga(id: number, empresaId: number) {
    // Filtrar por empresa_id directamente en la query
    const documento = await this.prisma.documentoGenerado.findFirst({
      where: {
        id,
        empleado: { empresa_id: empresaId },
      },
      include: {
        plantilla_documento: {
          select: { codigo: true, nombre: true },
        },
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            empresa_id: true,
          },
        },
      },
    });

    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (!documento.archivo_firmado_url) {
      throw new BadRequestException(
        'Este documento no tiene archivo adjunto. Primero debe subir el documento.',
      );
    }

    // Extraer la key del archivo desde la URL guardada
    let fileKey = documento.archivo_firmado_url;
    if (fileKey.startsWith('/uploads/')) {
      fileKey = fileKey.replace('/uploads/', '');
    }

    // Generar nombre de descarga amigable - sanitizado para prevenir header injection
    const extension = fileKey.split('.').pop() || 'pdf';
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '');
    const nombreEmpleado = sanitize(
      `${documento.empleado.apellido_paterno}_${documento.empleado.nombres}`.replace(
        /\s+/g,
        '_',
      ),
    );
    const codigo = sanitize(documento.plantilla_documento.codigo);
    const numeroDoc = sanitize(documento.empleado.numero_documento);
    const downloadName = `${codigo}_${numeroDoc}_${nombreEmpleado}.${extension}`;

    return {
      fileKey,
      downloadName,
      documento,
    };
  }

  /**
   * Obtiene el stream del archivo para Wasabi
   */
  async getFileStreamWasabi(key: string) {
    try {
      return await this.uploadsService.getFileFromWasabi(key);
    } catch (error: unknown) {
      this.logger.error(
        `Error obteniendo archivo de Wasabi: ${obtenerMensajeError(error)}`,
      );
      return null;
    }
  }

  /**
   * Obtiene la ruta completa del archivo local
   * SEGURIDAD: Valida path traversal para prevenir acceso a archivos fuera de UPLOADS_DIR
   */
  getLocalFilePath(key: string): string {
    // SEGURIDAD: Validar que el key no contenga path traversal
    if (
      key.includes('..') ||
      key.startsWith('/') ||
      key.startsWith('\\') ||
      /^[a-zA-Z]:/.test(key)
    ) {
      this.logger.warn(`[SECURITY] Path traversal attempt detected: ${key}`);
      throw new ForbiddenException('Ruta de archivo inválida');
    }

    const fullPath = join(UPLOADS_DIR, key);

    // SEGURIDAD: Verificar que la ruta resuelta está dentro de UPLOADS_DIR
    const resolvedPath = resolve(fullPath);
    const resolvedUploadsDir = resolve(UPLOADS_DIR);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      this.logger.warn(
        `[SECURITY] Path traversal attempt - resolved path outside uploads: ${resolvedPath}`,
      );
      throw new ForbiddenException('Ruta de archivo inválida');
    }

    return fullPath;
  }

  /**
   * Verifica si se está usando Wasabi
   */
  isUsingWasabi(): boolean {
    return this.uploadsService.isUsingWasabi();
  }

  /**
   * Verifica si un archivo local existe
   */
  localFileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Crea un read stream para archivo local
   */
  createLocalReadStream(filePath: string) {
    return createReadStream(filePath);
  }

  // ==================== AUDITORÍA ====================

  private async registrarAuditoria(
    tablaAfectada: string,
    registroId: number,
    accion: 'CREATE' | 'UPDATE' | 'DELETE',
    datosAnteriores: Prisma.InputJsonValue,
    datosNuevos: Prisma.InputJsonValue,
    usuarioId: number,
  ) {
    try {
      await this.prisma.auditoria.create({
        data: {
          tabla_afectada: tablaAfectada,
          registro_id: registroId,
          accion,
          datos_anteriores: datosAnteriores,
          datos_nuevos: datosNuevos,
          usuario_id: usuarioId,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Error registrando auditoría: ${obtenerMensajeError(error)}`,
      );
      // No lanzar error para no afectar la operación principal
    }
  }
}
