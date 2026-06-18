import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { exportarPlanilla } from './planilla-exportacion';
import { PlanillaDetalleService } from './planilla-detalle.service';
import { PlanillasCalcularService } from './planillas-calcular.service';
import {
  CreatePlanillaDto,
  UpdatePlanillaDetalleDto,
  FilterPlanillaDto,
} from './dto';
import { Prisma, AccionAuditoria } from '@prisma/client';
import {
  ahoraPeru,
  formatearFechaPeru,
} from '../../common/utils/datetime.util';

// Importar constantes y funciones de configuración
import {
  ESSALUD_PORCENTAJE,
  ESSALUD_MINIMO,
  RMV,
  ONP_PORCENTAJE,
  round2,
  safeNumber,
} from './planillas.config';

// Interfaz para advertencias de validación (exportada para tipado en controller)
export interface CalculoWarning {
  empleadoId: number;
  empleadoNombre: string;
  tipo:
    | 'SIN_REGIMEN'
    | 'SUELDO_CERO'
    | 'NETO_NEGATIVO'
    | 'SIN_TAREO'
    | 'TAREO_INCOMPLETO'
    | 'DIAS_SIN_MARCACION'
    | 'TURNO_INCONSISTENTE'
    | 'HORAS_CERO';
  mensaje: string;
}

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);

  constructor(
    private prisma: PrismaService,
    private readonly planillaDetalleService: PlanillaDetalleService,
    private readonly planillasCalcularService: PlanillasCalcularService,
  ) {}

  /**
   * Obtiene promedios históricos de los últimos 6 meses para un empleado
   * Usado para calcular remuneración computable de CTS y gratificación
   */
  async findAll(empresaId: number, filters: FilterPlanillaDto) {
    const { anio, mes, estado, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PlanillaWhereInput = {
      empresa_id: empresaId,
    };

    if (anio) where.anio = anio;
    if (mes) where.mes = mes;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.planilla.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        include: {
          periodo_tareo: {
            select: { id: true, estado: true },
          },
          aprobador: {
            select: { id: true, nombre_completo: true },
          },
          _count: {
            select: { detalles: true },
          },
        },
      }),
      this.prisma.planilla.count({ where }),
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

  async findOne(
    id: number,
    empresaId: number,
    includeDetalles: boolean = true,
  ) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        periodo_tareo: true,
        aprobador: {
          select: { id: true, nombre_completo: true },
        },
        _count: { select: { detalles: true } },
        // Solo incluir detalles si se solicita explícitamente (para retrocompatibilidad)
        ...(includeDetalles && {
          detalles: {
            include: {
              empleado: {
                select: {
                  id: true,
                  estado: true,
                  numero_documento: true,
                  nombres: true,
                  apellido_paterno: true,
                  apellido_materno: true,
                  fecha_ingreso: true,
                  fecha_cese: true,
                  fecha_nacimiento: true,
                  cuspp: true,
                  turno: true,
                  nro_cuenta_haberes: true,
                  cci_haberes: true,
                  area: { select: { nombre: true } },
                  cargo: { select: { nombre: true } },
                  sede: {
                    select: {
                      nombre: true,
                      cliente: {
                        select: { razon_social: true, nombre_comercial: true },
                      },
                    },
                  },
                  regimen_pensionario: {
                    select: { tipo: true, nombre: true },
                  },
                  banco_haberes: {
                    select: { nombre: true },
                  },
                },
              },
            },
            orderBy: {
              empleado: { apellido_paterno: 'asc' },
            },
          },
        }),
      },
    });

    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }

    return planilla;
  }

  // Método para obtener detalles de planilla con paginación (para planillas grandes)
  async findOneDetalles(
    id: number,
    empresaId: number,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ) {
    // Verificar que la planilla existe y pertenece a la empresa
    const planilla = await this.prisma.planilla.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true },
    });

    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }

    const skip = (page - 1) * limit;

    // Construir filtro de búsqueda por nombre o documento
    const searchFilter = search
      ? {
          empleado: {
            OR: [
              {
                numero_documento: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              { nombres: { contains: search, mode: 'insensitive' as const } },
              {
                apellido_paterno: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                apellido_materno: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        }
      : {};

    const [detalles, total] = await Promise.all([
      this.prisma.planillaDetalle.findMany({
        where: {
          planilla_id: id,
          ...searchFilter,
        },
        include: {
          empleado: {
            select: {
              id: true,
              estado: true,
              numero_documento: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              fecha_ingreso: true,
              fecha_cese: true,
              fecha_nacimiento: true,
              cuspp: true,
              turno: true,
              nro_cuenta_haberes: true,
              cci_haberes: true,
              area: { select: { nombre: true } },
              cargo: { select: { nombre: true } },
              sede: {
                select: {
                  nombre: true,
                  cliente: {
                    select: { razon_social: true, nombre_comercial: true },
                  },
                },
              },
              regimen_pensionario: {
                select: { tipo: true, nombre: true },
              },
              banco_haberes: {
                select: { nombre: true },
              },
            },
          },
        },
        orderBy: {
          empleado: { apellido_paterno: 'asc' },
        },
        skip,
        take: limit,
      }),
      this.prisma.planillaDetalle.count({
        where: {
          planilla_id: id,
          ...searchFilter,
        },
      }),
    ]);

    return {
      data: detalles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Versión ligera de findOne - no carga detalles (para validaciones)
  private async findOneSimple(id: number, empresaId: number) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id, empresa_id: empresaId },
      select: {
        id: true,
        empresa_id: true,
        periodo_tareo_id: true,
        anio: true,
        mes: true,
        estado: true,
        fecha_generacion: true,
        total_bruto: true,
        total_descuentos: true,
        total_neto: true,
        total_empleados: true,
      },
    });

    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }

    return planilla;
  }

  async create(empresaId: number, dto: CreatePlanillaDto, usuarioId?: number) {
    // Usar transacción para evitar race conditions (planillas duplicadas)
    return this.prisma
      .$transaction(async (tx) => {
        // Verificar si ya existe planilla para ese periodo (dentro de transacción)
        const exists = await tx.planilla.findUnique({
          where: {
            empresa_id_anio_mes: {
              empresa_id: empresaId,
              anio: dto.anio,
              mes: dto.mes,
            },
          },
          select: { id: true, estado: true },
        });

        if (exists) {
          // Si la planilla existente está ANULADA, eliminarla para permitir crear una nueva
          if (exists.estado === 'ANULADA') {
            // Eliminar boletas asociadas
            await tx.boleta.deleteMany({
              where: { planilla_detalle: { planilla_id: exists.id } },
            });
            // Eliminar detalles
            await tx.planillaDetalle.deleteMany({
              where: { planilla_id: exists.id },
            });
            // Eliminar planilla anulada
            await tx.planilla.delete({ where: { id: exists.id } });
          } else {
            throw new ConflictException(
              `Ya existe una planilla para ${dto.mes}/${dto.anio} en estado ${exists.estado}`,
            );
          }
        }

        // Buscar periodo de tareo si no se proporciona
        let periodoTareoId = dto.periodo_tareo_id;
        if (periodoTareoId) {
          // SEGURIDAD: Validar que el periodo_tareo_id pertenece a la empresa
          const periodoExistente = await tx.periodoTareo.findFirst({
            where: {
              id: periodoTareoId,
              empresa_id: empresaId,
            },
          });
          if (!periodoExistente) {
            throw new BadRequestException(
              'El período de tareo especificado no existe o no pertenece a esta empresa',
            );
          }
        } else {
          // Buscar periodo de tareo correspondiente al mes/año
          const periodo = await tx.periodoTareo.findFirst({
            where: {
              empresa_id: empresaId,
              anio: dto.anio,
              mes: dto.mes,
            },
          });
          periodoTareoId = periodo?.id;
        }

        const planilla = await tx.planilla.create({
          data: {
            empresa_id: empresaId,
            anio: dto.anio,
            mes: dto.mes,
            periodo_tareo_id: periodoTareoId,
            observaciones: dto.observaciones,
            estado: 'BORRADOR',
          },
        });

        // Registrar auditoría de creación
        await this.registrarAuditoria(tx, {
          tabla: 'planillas',
          registro_id: planilla.id,
          accion: 'CREAR',
          empresa_id: empresaId,
          usuario_id: usuarioId,
          datos_nuevos: { anio: dto.anio, mes: dto.mes, estado: 'BORRADOR' },
        });

        return planilla;
      })
      .then(async (planilla) => {
        // Calcular automáticamente al crear (fuera de la transacción de creación)
        try {
          return await this.calcular(planilla.id, empresaId, usuarioId);
        } catch (error) {
          // Si falla el cálculo, devolver la planilla con advertencia
          this.logger.warn(
            `No se pudo calcular automáticamente: ${error.message}`,
          );
          return {
            ...planilla,
            _warning: `Planilla creada pero el cálculo automático falló: ${error.message}`,
            _requiresManualCalculation: true,
          };
        }
      });
  }

  async calcular(id: number, empresaId: number, usuarioId?: number) {
    return this.planillasCalcularService.calcular(id, empresaId, usuarioId);
  }

  async updateDetalle(
    planillaId: number,
    detalleId: number,
    empresaId: number,
    dto: UpdatePlanillaDetalleDto,
    usuarioId?: number,
  ) {
    return this.planillaDetalleService.updateDetalle(
      planillaId,
      detalleId,
      empresaId,
      dto,
      usuarioId,
    );
  }

  async aprobar(id: number, empresaId: number, usuarioId: number) {
    // Verificar que existe (fuera de transacción para fail fast)
    await this.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'CALCULADA' && planilla.estado !== 'REVISADA') {
        throw new BadRequestException(
          'Solo se pueden aprobar planillas en estado CALCULADA o REVISADA',
        );
      }

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          fecha_aprobacion: ahoraPeru().toJSDate(),
          aprobado_por: usuarioId,
        },
      });

      await this.registrarAuditoria(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'APROBAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: planilla.estado },
        datos_nuevos: { estado: 'APROBADA' },
      });

      return updated;
    });
  }

  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    motivo?: string,
  ) {
    // Verificar que existe (fuera de transacción para fail fast)
    await this.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, observaciones: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'CALCULADA' && planilla.estado !== 'REVISADA') {
        throw new BadRequestException(
          'Solo se pueden rechazar planillas en estado CALCULADA o REVISADA',
        );
      }

      const nuevaObservacion = motivo
        ? `[RECHAZADA ${formatearFechaPeru(ahoraPeru().toJSDate(), 'yyyy-MM-dd')}]: ${motivo}${planilla.observaciones ? '\n' + planilla.observaciones : ''}`
        : planilla.observaciones;

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'BORRADOR',
          observaciones: nuevaObservacion,
          fecha_aprobacion: null,
          aprobado_por: null,
        },
      });

      await this.registrarAuditoria(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'RECHAZAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: planilla.estado },
        datos_nuevos: { estado: 'BORRADOR', motivo_rechazo: motivo },
      });

      return updated;
    });
  }

  async marcarPagada(id: number, empresaId: number, usuarioId?: number) {
    // Verificación inicial (fail-fast)
    await this.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, mes: true, anio: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'APROBADA') {
        throw new BadRequestException(
          'Solo se pueden marcar como pagadas las planillas aprobadas',
        );
      }

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'PAGADA',
          fecha_pago: ahoraPeru().toJSDate(),
        },
      });

      await this.registrarAuditoria(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'PAGAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: 'APROBADA' },
        datos_nuevos: { estado: 'PAGADA', fecha_pago: updated.fecha_pago },
      });

      return updated;
    });
  }

  async anular(
    id: number,
    empresaId: number,
    usuarioId?: number,
    motivo?: string,
  ) {
    // Verificación inicial (fail-fast)
    await this.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, observaciones: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado === 'PAGADA') {
        throw new BadRequestException('No se pueden anular planillas pagadas');
      }

      const estadoAnterior = planilla.estado;
      const nuevaObservacion = motivo
        ? `[ANULADA ${formatearFechaPeru(ahoraPeru().toJSDate(), 'yyyy-MM-dd')}]: ${motivo}${planilla.observaciones ? '\n' + planilla.observaciones : ''}`
        : planilla.observaciones;

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          observaciones: nuevaObservacion,
        },
      });

      await this.registrarAuditoria(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'ANULAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: estadoAnterior },
        datos_nuevos: { estado: 'ANULADA', motivo_anulacion: motivo },
      });

      return updated;
    });
  }

  async remove(id: number, empresaId: number, usuarioId?: number) {
    // Verificación inicial (fail-fast)
    await this.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción con empresa_id para evitar race conditions y cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: {
          id: true,
          estado: true,
          anio: true,
          mes: true,
          total_empleados: true,
        },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'BORRADOR' && planilla.estado !== 'ANULADA') {
        throw new BadRequestException(
          'Solo se pueden eliminar planillas en estado BORRADOR o ANULADA',
        );
      }

      // IMPORTANTE: Eliminar boletas existentes antes de eliminar detalles
      // Las boletas están vinculadas a planilla_detalle_id (relación 1:1)
      await tx.boleta.deleteMany({
        where: {
          planilla_detalle: {
            planilla_id: id,
          },
        },
      });

      // Eliminar detalles (después de eliminar boletas)
      await tx.planillaDetalle.deleteMany({ where: { planilla_id: id } });

      // Registrar auditoría antes de eliminar
      await this.registrarAuditoria(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'ELIMINAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: {
          anio: planilla.anio,
          mes: planilla.mes,
          estado: planilla.estado,
          total_empleados: planilla.total_empleados,
        },
        datos_nuevos: null,
      });

      await tx.planilla.delete({ where: { id } });

      return { message: 'Planilla eliminada correctamente' };
    });
  }

  // =============================================
  // MÉTODO DE AUDITORÍA
  // =============================================
  private async registrarAuditoria(
    tx: Prisma.TransactionClient,
    params: {
      tabla: string;
      registro_id: number;
      accion:
        | 'CREAR'
        | 'CALCULAR'
        | 'EDITAR'
        | 'APROBAR'
        | 'RECHAZAR'
        | 'PAGAR'
        | 'ANULAR'
        | 'ELIMINAR';
      empresa_id: number;
      usuario_id?: number;
      datos_anteriores?: any;
      datos_nuevos?: any;
    },
  ) {
    try {
      // Mapear acciones personalizadas a las del enum AccionAuditoria
      const accionMap: Record<string, AccionAuditoria> = {
        CREAR: AccionAuditoria.CREATE,
        CALCULAR: AccionAuditoria.UPDATE,
        EDITAR: AccionAuditoria.UPDATE,
        APROBAR: AccionAuditoria.UPDATE,
        RECHAZAR: AccionAuditoria.UPDATE,
        PAGAR: AccionAuditoria.UPDATE,
        ANULAR: AccionAuditoria.UPDATE,
        ELIMINAR: AccionAuditoria.DELETE,
      };

      await tx.auditoria.create({
        data: {
          tabla_afectada: params.tabla,
          registro_id: params.registro_id,
          accion: accionMap[params.accion] || AccionAuditoria.UPDATE,
          usuario_id: params.usuario_id || null,
          datos_anteriores: params.datos_anteriores
            ? { ...params.datos_anteriores, _accion_detalle: params.accion }
            : null,
          datos_nuevos: params.datos_nuevos
            ? { ...params.datos_nuevos, _accion_detalle: params.accion }
            : null,
        },
      });
    } catch (error) {
      // Si falla la auditoría, solo loguear pero no fallar la operación principal
      this.logger.warn(`Error al registrar auditoría: ${error.message}`);
    }
  }

  // Resumen para dashboard
  async getResumen(empresaId: number) {
    const currentYear = ahoraPeru().year;

    const [planillasAnio, ultimaPlanilla] = await Promise.all([
      this.prisma.planilla.findMany({
        where: {
          empresa_id: empresaId,
          anio: currentYear,
          estado: { not: 'ANULADA' },
        },
        orderBy: { mes: 'asc' },
        select: {
          mes: true,
          total_neto: true,
          total_empleados: true,
          estado: true,
        },
      }),
      this.prisma.planilla.findFirst({
        where: {
          empresa_id: empresaId,
          estado: { not: 'ANULADA' },
        },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        select: {
          anio: true,
          mes: true,
          total_neto: true,
          total_empleados: true,
          estado: true,
        },
      }),
    ]);

    const totalAnual = planillasAnio.reduce(
      (sum, p) => sum + Number(p.total_neto),
      0,
    );

    return {
      planillas_anio: planillasAnio,
      total_anual: totalAnual,
      ultima_planilla: ultimaPlanilla,
      anio: currentYear,
    };
  }

  // Exportar a Excel (datos para el frontend)
  async exportar(id: number, empresaId: number) {
    return exportarPlanilla(this.prisma, id, empresaId);
  }
}
