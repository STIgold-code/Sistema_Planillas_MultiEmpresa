import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FilterTareoDto,
  UpdateTareoDetalleDto,
  BulkUpdateTareoDto,
  CreateJustificacionDto,
  UpdateJustificacionDto,
  AddArchivoDto,
} from './dto';
import { TareoJustificacionesService } from './tareo-justificaciones.service';
import { TareoGrillaService } from './tareo-grilla.service';
import { TareoEdicionService } from './tareo-edicion.service';

@Injectable()
export class TareoService {
  constructor(
    private prisma: PrismaService,
    private justificacionesService: TareoJustificacionesService,
    private tareoGrillaService: TareoGrillaService,
    private tareoEdicionService: TareoEdicionService,
  ) {}

  /**
   * Verifica si un día del mes está dentro del rango del contrato del empleado
   * @returns true si el día está dentro del contrato, false si está fuera
   */

  // Obtener grilla completa del periodo — delega a TareoGrillaService
  async getGrilla(
    periodoId: number,
    empresaId: number,
    filters?: FilterTareoDto,
  ) {
    return this.tareoGrillaService.getGrilla(periodoId, empresaId, filters);
  }

  async getTareoEmpleado(
    periodoId: number,
    empleadoId: number,
    empresaId: number,
  ) {
    const tareo = await this.prisma.tareo.findFirst({
      where: {
        periodo_id: periodoId,
        empleado_id: empleadoId,
        periodo: { empresa_id: empresaId },
      },
      include: {
        periodo: true,
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            apellido_paterno: true,
            apellido_materno: true,
            nombres: true,
            fecha_ingreso: true,
          },
        },
        area: true,
        sede: true,
        cargo: true,
        detalles: {
          orderBy: { dia: 'asc' },
          include: {
            tipo_marcacion: true,
            audits: {
              orderBy: { created_at: 'desc' },
              take: 5,
              include: {
                usuario: { select: { id: true, nombre_completo: true } },
              },
            },
          },
        },
      },
    });

    if (!tareo) {
      throw new NotFoundException('Tareo no encontrado');
    }

    return tareo;
  }

  /**
   * Obtiene información básica de un detalle (para validación de sesión)
   */
  async getDetalleInfo(detalleId: number, empresaId: number) {
    const detalle = await this.prisma.tareoDetalle.findUnique({
      where: { id: detalleId },
      select: {
        id: true,
        tareo: {
          select: {
            periodo_id: true,
            periodo: {
              select: {
                empresa_id: true,
              },
            },
          },
        },
      },
    });

    if (!detalle || detalle.tareo.periodo.empresa_id !== empresaId) {
      throw new NotFoundException('Detalle no encontrado');
    }

    return {
      detalle_id: detalle.id,
      periodo_id: detalle.tareo.periodo_id,
    };
  }

  /**
   * Obtiene el periodo_id de un tareo (para validar sesión antes de crear justificación)
   */
  async getTareoPeriodoId(tareoId: number, empresaId: number): Promise<number> {
    const tareo = await this.prisma.tareo.findFirst({
      where: { id: tareoId, periodo: { empresa_id: empresaId } },
      select: { periodo_id: true },
    });

    if (!tareo) {
      throw new NotFoundException('Tareo no encontrado');
    }

    return tareo.periodo_id;
  }

  // Actualizar una celda individual

  async updateDetalle(
    detalleId: number,
    empresaId: number,
    usuarioId: number,
    dto: UpdateTareoDetalleDto,
    ipAddress?: string,
    sinRestriccionSesion = false,
  ) {
    return this.tareoEdicionService.updateDetalle(
      detalleId,
      empresaId,
      usuarioId,
      dto,
      ipAddress,
      sinRestriccionSesion,
    );
  }

  async bulkUpdate(
    periodoId: number,
    empresaId: number,
    usuarioId: number,
    dto: BulkUpdateTareoDto,
    ipAddress?: string,
    sinRestriccionSesion = false,
  ) {
    return this.tareoEdicionService.bulkUpdate(
      periodoId,
      empresaId,
      usuarioId,
      dto,
      ipAddress,
      sinRestriccionSesion,
    );
  }

  async getHistorial(detalleId: number, empresaId: number) {
    const detalle = await this.prisma.tareoDetalle.findUnique({
      where: { id: detalleId },
      include: {
        tareo: {
          include: { periodo: true, empleado: true },
        },
      },
    });

    if (!detalle || detalle.tareo.periodo.empresa_id !== empresaId) {
      throw new NotFoundException('Detalle no encontrado');
    }

    const audits = await this.prisma.tareoDetalleAudit.findMany({
      where: { tareo_detalle_id: detalleId },
      orderBy: { created_at: 'desc' },
      include: {
        usuario: { select: { id: true, nombre_completo: true, email: true } },
      },
    });

    return {
      detalle: {
        id: detalle.id,
        dia: detalle.dia,
        empleado: `${detalle.tareo.empleado.apellido_paterno} ${detalle.tareo.empleado.apellido_materno}`,
      },
      historial: audits,
    };
  }

  // Obtener resumen de un empleado específico
  async getResumenEmpleado(
    periodoId: number,
    empleadoId: number,
    empresaId: number,
  ) {
    const tareo = await this.prisma.tareo.findFirst({
      where: {
        periodo_id: periodoId,
        empleado_id: empleadoId,
        periodo: { empresa_id: empresaId },
      },
      include: {
        detalles: {
          include: { tipo_marcacion: true },
        },
      },
    });

    if (!tareo) {
      throw new NotFoundException('Tareo no encontrado');
    }

    // Calcular totales
    const totales: Record<string, number> = {};
    let diasTrabajados = 0;
    let diasDescanso = 0;
    let diasFalta = 0;

    tareo.detalles.forEach((d) => {
      if (d.tipo_marcacion) {
        const codigo = d.tipo_marcacion.codigo;
        totales[codigo] = (totales[codigo] || 0) + 1;

        // Clasificar
        if (d.tipo_marcacion.es_laborable) {
          diasTrabajados++;
        } else if (codigo === 'DL' || codigo === 'H') {
          diasDescanso++;
        } else if (codigo === 'F') {
          diasFalta++;
        }
      }
    });

    return {
      tareo_id: tareo.id,
      empleado_id: empleadoId,
      resumen: {
        dias_trabajados: diasTrabajados,
        dias_descanso: diasDescanso,
        dias_falta: diasFalta,
        por_codigo: totales,
      },
    };
  }

  // Obtener sedes de la empresa
  async getSedes(empresaId: number) {
    return this.prisma.sede.findMany({
      where: { empresa_id: empresaId, activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        cliente_id: true,
        cliente: { select: { id: true, razon_social: true } },
      },
    });
  }

  // =============================================
  // JUSTIFICACIONES — delegación a TareoJustificacionesService
  // =============================================

  getAllJustificaciones(
    empresaId: number,
    filters: {
      empleado_id?: number;
      anio?: number;
      mes?: number;
      sede_id?: number;
      area_id?: number;
      tipo?: string;
      busqueda?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.justificacionesService.getAllJustificaciones(
      empresaId,
      filters,
    );
  }

  getJustificacionesByEmpleado(
    empresaId: number,
    empleadoId: number,
    anio?: number,
  ) {
    return this.justificacionesService.getJustificacionesByEmpleado(
      empresaId,
      empleadoId,
      anio,
    );
  }

  getJustificacionesByTareo(tareoId: number, empresaId: number) {
    return this.justificacionesService.getJustificacionesByTareo(
      tareoId,
      empresaId,
    );
  }

  getJustificacion(id: number, empresaId: number) {
    return this.justificacionesService.getJustificacion(id, empresaId);
  }

  createJustificacion(
    dto: CreateJustificacionDto,
    usuarioId: number,
    empresaId: number,
  ) {
    return this.justificacionesService.createJustificacion(
      dto,
      usuarioId,
      empresaId,
    );
  }

  updateJustificacion(
    id: number,
    dto: UpdateJustificacionDto,
    empresaId: number,
  ) {
    return this.justificacionesService.updateJustificacion(id, dto, empresaId);
  }

  deleteJustificacion(id: number, empresaId: number, usuarioId?: number) {
    return this.justificacionesService.deleteJustificacion(
      id,
      empresaId,
      usuarioId,
    );
  }

  addArchivoToJustificacion(
    justificacionId: number,
    archivo: AddArchivoDto,
    empresaId: number,
  ) {
    return this.justificacionesService.addArchivoToJustificacion(
      justificacionId,
      archivo,
      empresaId,
    );
  }

  removeArchivo(archivoId: number, empresaId: number) {
    return this.justificacionesService.removeArchivo(archivoId, empresaId);
  }

  getAlertasFaltas(
    empresaId: number,
    filters: {
      fecha_inicio: Date;
      fecha_fin: Date;
      sede_id?: number;
      area_id?: number;
      minimo_faltas?: number;
    },
  ) {
    return this.justificacionesService.getAlertasFaltas(empresaId, filters);
  }

  getDiasConJustificacion(periodoId: number, empresaId: number) {
    return this.justificacionesService.getDiasConJustificacion(
      periodoId,
      empresaId,
    );
  }

  getJustificacionPeriodoId(
    justificacionId: number,
    empresaId: number,
  ): Promise<number> {
    return this.justificacionesService.getJustificacionPeriodoId(
      justificacionId,
      empresaId,
    );
  }

  getArchivoPeriodoId(archivoId: number, empresaId: number): Promise<number> {
    return this.justificacionesService.getArchivoPeriodoId(
      archivoId,
      empresaId,
    );
  }
}
