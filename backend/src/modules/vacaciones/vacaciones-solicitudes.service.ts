import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSolicitudDto,
  FilterSolicitudDto,
  AprobarJefeDto,
  AprobarRrhhDto,
  CancelarSolicitudDto,
} from './dto';
import { AccionAprobacion } from './dto/aprobar-solicitud.dto';
import {
  Prisma,
  EstadoSolicitudVacaciones,
  EstadoPeriodoVacacional,
  TipoMovimientoVacacional,
} from '@prisma/client';
import { VacacionesTareoSyncService } from './vacaciones-tareo-sync.service';
import { VacacionesAprobacionService } from './vacaciones-aprobacion.service';
import {
  ahoraPeru,
  formatearFechaPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';

@Injectable()
export class VacacionesSolicitudesService {
  private readonly logger = new Logger(VacacionesSolicitudesService.name);

  constructor(
    private prisma: PrismaService,
    private tareoSyncService: VacacionesTareoSyncService,
    private vacacionesAprobacionService: VacacionesAprobacionService,
  ) {}

  // Helper copiado de VacacionesService (necesario para createSolicitud)
  private async getConfiguracion(empresaId: number) {
    let config = await this.prisma.configuracionVacaciones.findUnique({
      where: { empresa_id: empresaId },
    });

    if (!config) {
      config = await this.prisma.configuracionVacaciones.create({
        data: { empresa_id: empresaId },
      });
    }

    return config;
  }

  async findAllSolicitudes(empresaId: number, filters: FilterSolicitudDto) {
    const {
      buscar,
      empleado_id,
      area_id,
      estado,
      fecha_desde,
      fecha_hasta,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SolicitudVacacionesWhereInput = {
      empresa_id: empresaId,
    };

    if (empleado_id) where.empleado_id = empleado_id;
    if (estado) where.estado = estado;

    if (buscar) {
      where.empleado = {
        is: {
          OR: [
            { nombres: { contains: buscar, mode: 'insensitive' } },
            { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
            { apellido_materno: { contains: buscar, mode: 'insensitive' } },
            { numero_documento: { contains: buscar, mode: 'insensitive' } },
          ],
        },
      };
    }

    if (area_id) {
      where.empleado = {
        is: {
          ...(where.empleado as any)?.is,
          area_id,
        },
      };
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_inicio_solicitada = {};
      if (fecha_desde) {
        where.fecha_inicio_solicitada.gte = parsearFechaISOenPeru(fecha_desde);
      }
      if (fecha_hasta) {
        where.fecha_inicio_solicitada.lte = parsearFechaISOenPeru(fecha_hasta);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.solicitudVacaciones.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          empleado: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              numero_documento: true,
              area: { select: { id: true, nombre: true } },
            },
          },
          periodo_vacacional: {
            select: {
              id: true,
              numero_periodo: true,
              dias_pendientes: true,
            },
          },
          creado_por: { select: { id: true, nombre_completo: true } },
          aprobado_por_jefe: { select: { id: true, nombre_completo: true } },
          aprobado_por_rrhh: { select: { id: true, nombre_completo: true } },
        },
      }),
      this.prisma.solicitudVacaciones.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneSolicitud(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudVacaciones.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            sueldo_base: true,
            area: { select: { id: true, nombre: true } },
          },
        },
        periodo_vacacional: true,
        creado_por: { select: { id: true, nombre_completo: true } },
        aprobado_por_jefe: { select: { id: true, nombre_completo: true } },
        aprobado_por_rrhh: { select: { id: true, nombre_completo: true } },
        rechazado_por: { select: { id: true, nombre_completo: true } },
        cancelado_por: { select: { id: true, nombre_completo: true } },
        movimientos: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    return solicitud;
  }

  async createSolicitud(
    empresaId: number,
    dto: CreateSolicitudDto,
    usuarioId: number,
  ) {
    // Obtener configuración primero para validaciones síncronas
    const config = await this.getConfiguracion(empresaId);

    // Validaciones síncronas (no requieren BD) - se hacen fuera de la transacción
    // H3: Validar que fecha de inicio no sea en el pasado - usando zona horaria Peru
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const fechaInicio = parsearFechaISOenPeru(dto.fecha_inicio_solicitada);

    if (fechaInicio < hoy) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser anterior a hoy',
      );
    }

    // C3: Validar mínimo de días de goce
    if (dto.dias_solicitados < config.dias_minimo_goce) {
      throw new BadRequestException(
        `Debe solicitar al menos ${config.dias_minimo_goce} días de vacaciones`,
      );
    }

    // TRANSACCIÓN: Todas las validaciones de BD y creación en una sola transacción
    // Esto previene race conditions donde dos requests paralelos crean solicitudes superpuestas
    const solicitud = await this.prisma.$transaction(async (tx) => {
      // VALIDACIÓN: Verificar que el empleado está activo
      const empleado = await tx.empleado.findFirst({
        where: { id: dto.empleado_id, empresa_id: empresaId },
        select: {
          id: true,
          estado: true,
          nombres: true,
          apellido_paterno: true,
        },
      });

      if (!empleado) {
        throw new NotFoundException('Empleado no encontrado');
      }

      if (empleado.estado === 'CESADO') {
        throw new BadRequestException(
          'No se puede solicitar vacaciones para un empleado cesado',
        );
      }

      // Validar que el período existe y pertenece al empleado
      const periodo = await tx.periodoVacacional.findFirst({
        where: {
          id: dto.periodo_vacacional_id,
          empleado_id: dto.empleado_id,
          empresa_id: empresaId,
        },
      });

      if (!periodo) {
        throw new NotFoundException('Período vacacional no encontrado');
      }

      // Validar que hay días disponibles
      if (dto.dias_solicitados > periodo.dias_pendientes) {
        throw new BadRequestException(
          `Solo tiene ${periodo.dias_pendientes} días disponibles en este período`,
        );
      }

      // H4: Validar límite de períodos acumulados
      const periodosDisponibles = await tx.periodoVacacional.findMany({
        where: {
          empleado_id: dto.empleado_id,
          empresa_id: empresaId,
          estado: {
            in: [
              EstadoPeriodoVacacional.DISPONIBLE,
              EstadoPeriodoVacacional.PARCIAL,
            ],
          },
          dias_pendientes: { gt: 0 },
        },
      });

      if (periodosDisponibles.length > config.max_periodos_acumulados) {
        throw new BadRequestException(
          `El empleado tiene ${periodosDisponibles.length} períodos acumulados. Máximo permitido: ${config.max_periodos_acumulados}. Debe gozar vacaciones de períodos anteriores primero.`,
        );
      }

      // Validar venta de vacaciones
      if (dto.incluye_venta && dto.dias_venta) {
        const maxVenta = Math.floor(
          (periodo.dias_correspondientes * config.porcentaje_max_venta) / 100,
        );
        const ventaAcumulada = periodo.dias_vendidos + dto.dias_venta;
        if (ventaAcumulada > maxVenta) {
          throw new BadRequestException(
            `Solo puede vender ${maxVenta - periodo.dias_vendidos} días más de este período`,
          );
        }
      }

      // H2: Validar que no hay solicitudes superpuestas (incluyendo fechas aprobadas)
      const solicitudesExistentes = await tx.solicitudVacaciones.findMany({
        where: {
          empleado_id: dto.empleado_id,
          estado: {
            in: [
              EstadoSolicitudVacaciones.PENDIENTE_JEFE,
              EstadoSolicitudVacaciones.PENDIENTE_RRHH,
              EstadoSolicitudVacaciones.APROBADA,
              EstadoSolicitudVacaciones.EN_GOCE,
            ],
          },
          OR: [
            // Superposición con fechas solicitadas
            {
              fecha_inicio_solicitada: {
                lte: parsearFechaISOenPeru(dto.fecha_fin_solicitada),
              },
              fecha_fin_solicitada: {
                gte: parsearFechaISOenPeru(dto.fecha_inicio_solicitada),
              },
            },
            // H2: Superposición con fechas aprobadas (pueden ser diferentes)
            {
              fecha_inicio_aprobada: {
                lte: parsearFechaISOenPeru(dto.fecha_fin_solicitada),
              },
              fecha_fin_aprobada: {
                gte: parsearFechaISOenPeru(dto.fecha_inicio_solicitada),
              },
            },
          ],
        },
      });

      if (solicitudesExistentes.length > 0) {
        throw new BadRequestException(
          'Ya existe una solicitud en esas fechas para este empleado',
        );
      }

      // Crear solicitud dentro de la transacción
      return tx.solicitudVacaciones.create({
        data: {
          empleado_id: dto.empleado_id,
          periodo_vacacional_id: dto.periodo_vacacional_id,
          empresa_id: empresaId,
          fecha_inicio_solicitada: parsearFechaISOenPeru(
            dto.fecha_inicio_solicitada,
          ),
          fecha_fin_solicitada: parsearFechaISOenPeru(dto.fecha_fin_solicitada),
          dias_solicitados: dto.dias_solicitados,
          incluye_venta: dto.incluye_venta || false,
          dias_venta: dto.dias_venta || 0,
          observaciones: dto.observaciones,
          creado_por_id: usuarioId,
          estado: EstadoSolicitudVacaciones.PENDIENTE_JEFE,
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
          periodo_vacacional: true,
        },
      });
    });

    return solicitud;
  }

  // ==================== APROBACION (delega a VacacionesAprobacionService) ====================

  async aprobarPorJefe(
    id: number,
    empresaId: number,
    dto: AprobarJefeDto,
    usuarioId: number,
  ) {
    return this.vacacionesAprobacionService.aprobarPorJefe(
      id,
      empresaId,
      dto,
      usuarioId,
    );
  }

  async aprobarPorRrhh(
    id: number,
    empresaId: number,
    dto: AprobarRrhhDto,
    usuarioId: number,
  ) {
    return this.vacacionesAprobacionService.aprobarPorRrhh(
      id,
      empresaId,
      dto,
      usuarioId,
    );
  }

  async cancelarSolicitud(
    id: number,
    empresaId: number,
    dto: CancelarSolicitudDto,
    usuarioId: number,
  ) {
    return this.vacacionesAprobacionService.cancelarSolicitud(
      id,
      empresaId,
      dto,
      usuarioId,
    );
  }
}
