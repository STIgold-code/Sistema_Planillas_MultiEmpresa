import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccionAuditoria, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

/**
 * Interfaz para registrar cambios de estado
 */
export interface RegistrarCambioEstadoParams {
  tablaAfectada: string;
  registroId: number;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: number;
  usuarioEmail?: string;
  motivo?: string;
  datosAdicionales?: Record<string, any>;
}

/**
 * Interfaz para registrar cambios de campos sensibles
 */
export interface RegistrarCambioCampoParams {
  tablaAfectada: string;
  registroId: number;
  campo: string;
  valorAnterior: any;
  valorNuevo: any;
  usuarioId: number;
  usuarioEmail?: string;
}

/**
 * Interfaz para filtrar auditoría
 */
export interface FiltroAuditoriaParams {
  tablaAfectada?: string;
  registroId?: number;
  usuarioId?: number;
  accion?: AccionAuditoria;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page?: number;
  limit?: number;
}

/**
 * Interfaz unificada para registro de auditoría asíncrona
 * Diseñada para operaciones no bloqueantes (fire-and-forget)
 */
export interface RegistrarAuditoriaAsyncParams {
  accion: AccionAuditoria;
  tablaAfectada: string;
  registroId: number | null;
  usuarioId: number;
  usuarioEmail?: string;
  empresaId?: number;
  datosAnteriores?: Record<string, any>;
  datosNuevos?: Record<string, any>;
  descripcion?: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra auditoría de forma asíncrona (fire-and-forget).
   * No bloquea la operación principal y maneja errores silenciosamente.
   */
  registrarAsync(params: RegistrarAuditoriaAsyncParams): void {
    setImmediate(async () => {
      try {
        await this.prisma.auditoria.create({
          data: {
            usuario_id: params.usuarioId,
            usuario_email: params.usuarioEmail,
            empresa_id: params.empresaId,
            accion: params.accion,
            tabla_afectada: params.tablaAfectada,
            registro_id: params.registroId,
            datos_anteriores: params.datosAnteriores || null,
            datos_nuevos: params.datosNuevos
              ? {
                  ...params.datosNuevos,
                  _descripcion: params.descripcion,
                }
              : params.descripcion
                ? { _descripcion: params.descripcion }
                : null,
          },
        });

        this.logger.debug(
          `Auditoría registrada: ${params.accion} en ${params.tablaAfectada}[${params.registroId}]`,
        );
      } catch (error) {
        this.logger.error(
          `Error registrando auditoría async: ${error.message}`,
          error.stack,
        );
      }
    });
  }

  /**
   * Registra un cambio de estado en cualquier entidad
   */
  async registrarCambioEstado(params: RegistrarCambioEstadoParams) {
    const {
      tablaAfectada,
      registroId,
      estadoAnterior,
      estadoNuevo,
      usuarioId,
      usuarioEmail,
      motivo,
      datosAdicionales,
    } = params;

    try {
      const auditoria = await this.prisma.auditoria.create({
        data: {
          usuario_id: usuarioId,
          usuario_email: usuarioEmail,
          accion: 'UPDATE',
          tabla_afectada: tablaAfectada,
          registro_id: registroId,
          datos_anteriores: {
            estado: estadoAnterior,
          },
          datos_nuevos: {
            estado: estadoNuevo,
            motivo: motivo || null,
            ...datosAdicionales,
          },
        },
      });

      this.logger.log(
        `Cambio de estado registrado: ${tablaAfectada}[${registroId}] ${estadoAnterior} -> ${estadoNuevo} por usuario ${usuarioId}`,
      );

      return auditoria;
    } catch (error) {
      this.logger.error(
        `Error registrando cambio de estado: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Registra cambios en campos sensibles (sueldo, datos bancarios, etc.)
   */
  async registrarCambioCampo(params: RegistrarCambioCampoParams) {
    const {
      tablaAfectada,
      registroId,
      campo,
      valorAnterior,
      valorNuevo,
      usuarioId,
      usuarioEmail,
    } = params;

    if (valorAnterior === valorNuevo) {
      return null;
    }

    try {
      const auditoria = await this.prisma.auditoria.create({
        data: {
          usuario_id: usuarioId,
          usuario_email: usuarioEmail,
          accion: 'UPDATE',
          tabla_afectada: tablaAfectada,
          registro_id: registroId,
          datos_anteriores: {
            [campo]: valorAnterior,
          },
          datos_nuevos: {
            [campo]: valorNuevo,
          },
        },
      });

      this.logger.log(
        `Cambio de campo sensible: ${tablaAfectada}[${registroId}].${campo} por usuario ${usuarioId}`,
      );

      return auditoria;
    } catch (error) {
      this.logger.error(
        `Error registrando cambio de campo: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Registra múltiples cambios de campos en una sola operación
   */
  async registrarCambiosCampos(
    tablaAfectada: string,
    registroId: number,
    cambios: Array<{ campo: string; valorAnterior: any; valorNuevo: any }>,
    usuarioId: number,
    usuarioEmail?: string,
  ) {
    const cambiosReales = cambios.filter(
      (c) => c.valorAnterior !== c.valorNuevo,
    );

    if (cambiosReales.length === 0) {
      return null;
    }

    const datosAnteriores: Record<string, any> = {};
    const datosNuevos: Record<string, any> = {};

    cambiosReales.forEach((c) => {
      datosAnteriores[c.campo] = c.valorAnterior;
      datosNuevos[c.campo] = c.valorNuevo;
    });

    try {
      const auditoria = await this.prisma.auditoria.create({
        data: {
          usuario_id: usuarioId,
          usuario_email: usuarioEmail,
          accion: 'UPDATE',
          tabla_afectada: tablaAfectada,
          registro_id: registroId,
          datos_anteriores: datosAnteriores,
          datos_nuevos: datosNuevos,
        },
      });

      this.logger.log(
        `Cambios múltiples registrados: ${tablaAfectada}[${registroId}] - ${cambiosReales.length} campos`,
      );

      return auditoria;
    } catch (error) {
      this.logger.error(
        `Error registrando cambios múltiples: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Registra una acción genérica (CREATE, DELETE, LOGIN, LOGOUT)
   */
  async registrarAccion(
    accion: AccionAuditoria,
    tablaAfectada: string,
    registroId: number | null,
    usuarioId: number,
    usuarioEmail?: string,
    datos?: Record<string, any>,
  ) {
    try {
      const auditoria = await this.prisma.auditoria.create({
        data: {
          usuario_id: usuarioId,
          usuario_email: usuarioEmail,
          accion: accion,
          tabla_afectada: tablaAfectada,
          registro_id: registroId,
          datos_nuevos: datos || null,
        },
      });

      return auditoria;
    } catch (error) {
      this.logger.error(
        `Error registrando acción: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Obtiene el historial de una entidad específica
   * Filtra por empresa_id para garantizar aislamiento multi-tenant
   */
  async getHistorialEntidad(
    empresaId: number,
    tablaAfectada: string,
    registroId: number,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;

    // Filtro multi-tenant: solo registros donde el usuario pertenece a la empresa
    // o el registro de auditoría tiene empresa_id directamente
    const where: Prisma.AuditoriaWhereInput = {
      tabla_afectada: tablaAfectada,
      registro_id: registroId,
      OR: [{ empresa_id: empresaId }, { usuario: { empresa_id: empresaId } }],
    };

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nombre_completo: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene historial con filtros avanzados
   */
  async getHistorialFiltrado(
    empresaId: number,
    filtros: FiltroAuditoriaParams,
  ) {
    const { page = 1, limit = 50 } = filtros;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditoriaWhereInput = {};

    if (filtros.tablaAfectada) {
      where.tabla_afectada = filtros.tablaAfectada;
    }

    if (filtros.registroId) {
      where.registro_id = filtros.registroId;
    }

    if (filtros.usuarioId) {
      where.usuario_id = filtros.usuarioId;
    }

    if (filtros.accion) {
      where.accion = filtros.accion;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.created_at = {};
      if (filtros.fechaDesde) {
        where.created_at.gte = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        where.created_at.lte = filtros.fechaHasta;
      }
    }

    where.usuario = {
      empresa_id: empresaId,
    };

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nombre_completo: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene resumen de actividad por usuario
   */
  async getResumenActividad(
    empresaId: number,
    fechaDesde: Date,
    fechaHasta: Date,
  ) {
    const resumen = await this.prisma.auditoria.groupBy({
      by: ['usuario_id', 'accion', 'tabla_afectada'],
      where: {
        created_at: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
        usuario: {
          empresa_id: empresaId,
        },
      },
      _count: {
        id: true,
      },
    });

    return resumen;
  }

  /**
   * Exporta auditoría a Excel
   */
  async exportarExcel(
    empresaId: number,
    filtros: FiltroAuditoriaParams,
  ): Promise<ExcelJS.Workbook> {
    const { limit = 10000 } = filtros;

    const where: Prisma.AuditoriaWhereInput = {
      usuario: { empresa_id: empresaId },
    };

    if (filtros.tablaAfectada) {
      where.tabla_afectada = filtros.tablaAfectada;
    }
    if (filtros.accion) {
      where.accion = filtros.accion;
    }
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.created_at = {};
      if (filtros.fechaDesde) where.created_at.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) where.created_at.lte = filtros.fechaHasta;
    }

    const registros = await this.prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: { nombre_completo: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERMIR RRHH';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Auditoría');

    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Acción', key: 'accion', width: 18 },
      { header: 'Módulo', key: 'modulo', width: 20 },
      { header: 'ID Registro', key: 'registro_id', width: 12 },
      { header: 'Datos Anteriores', key: 'datos_anteriores', width: 40 },
      { header: 'Datos Nuevos', key: 'datos_nuevos', width: 40 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    registros.forEach((reg) => {
      const formatJson = (data: any) => {
        if (!data) return '';
        try {
          const { _descripcion, ...rest } = data;
          return Object.keys(rest).length > 0
            ? JSON.stringify(rest, null, 0)
            : '';
        } catch {
          return '';
        }
      };

      sheet.addRow({
        fecha: reg.created_at
          ? new Date(reg.created_at).toLocaleString('es-PE')
          : '',
        usuario: reg.usuario?.nombre_completo || 'Sistema',
        email: reg.usuario?.email || '',
        accion: reg.accion,
        modulo: reg.tabla_afectada,
        registro_id: reg.registro_id || '',
        datos_anteriores: formatJson(reg.datos_anteriores),
        datos_nuevos: formatJson(reg.datos_nuevos),
      });
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          };
        });
      }
    });

    return workbook;
  }
}
