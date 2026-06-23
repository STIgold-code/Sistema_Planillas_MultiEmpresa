import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSolicitudDto,
  FilterSolicitudDto,
  AprobarJefeDto,
  AprobarRrhhDto,
  CancelarSolicitudDto,
  FilterPeriodoVacacionalDto,
  UpdateConfiguracionVacacionesDto,
} from './dto';
import {
  Prisma,
  EstadoSolicitudVacaciones,
  EstadoPeriodoVacacional,
} from '@prisma/client';
import { VacacionesSolicitudesService } from './vacaciones-solicitudes.service';
import {
  ahoraPeru,
  sumarDiasPeru,
  leerFechaPrisma,
} from '../../common/utils/datetime.util';

@Injectable()
export class VacacionesService {
  private readonly logger = new Logger(VacacionesService.name);

  constructor(
    private prisma: PrismaService,
    private solicitudesService: VacacionesSolicitudesService,
  ) {}

  // ==================== CONFIGURACIÓN ====================

  async getConfiguracion(empresaId: number) {
    let config = await this.prisma.configuracionVacaciones.findUnique({
      where: { empresa_id: empresaId },
    });

    // Crear configuración por defecto si no existe
    if (!config) {
      config = await this.prisma.configuracionVacaciones.create({
        data: { empresa_id: empresaId },
      });
    }

    return config;
  }

  async updateConfiguracion(
    empresaId: number,
    dto: UpdateConfiguracionVacacionesDto,
  ) {
    await this.getConfiguracion(empresaId); // Asegurar que existe

    return this.prisma.configuracionVacaciones.update({
      where: { empresa_id: empresaId },
      data: dto,
    });
  }

  // ==================== PERÍODOS VACACIONALES ====================

  async findAllPeriodos(
    empresaId: number,
    filters: FilterPeriodoVacacionalDto,
  ) {
    const { empleado_id, estado, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PeriodoVacacionalWhereInput = {
      empresa_id: empresaId,
    };

    if (empleado_id) where.empleado_id = empleado_id;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.periodoVacacional.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ empleado_id: 'asc' }, { numero_periodo: 'desc' }],
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
        },
      }),
      this.prisma.periodoVacacional.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOnePeriodo(id: number, empresaId: number) {
    const periodo = await this.prisma.periodoVacacional.findFirst({
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
            es_mype: true,
            area: { select: { id: true, nombre: true } },
          },
        },
        solicitudes: {
          orderBy: { created_at: 'desc' },
          include: {
            creado_por: { select: { id: true, nombre_completo: true } },
          },
        },
        movimientos: {
          orderBy: { fecha_movimiento: 'desc' },
        },
      },
    });

    if (!periodo) {
      throw new NotFoundException('Período vacacional no encontrado');
    }

    return periodo;
  }

  async generarPeriodosEmpleado(empleadoId: number, empresaId: number) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const config = await this.getConfiguracion(empresaId);
    // Siempre usar régimen general (30 días)
    const diasCorrespondientes = config.dias_regimen_general;

    const fechaIngreso = leerFechaPrisma(empleado.fecha_ingreso).toJSDate();
    // Usar zona horaria Peru para calcular años trabajados
    const hoy = ahoraPeru().toJSDate();

    // Calcular cuántos períodos debería tener
    const aniosTrabajados = Math.floor(
      (hoy.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // Obtener períodos existentes
    const periodosExistentes = await this.prisma.periodoVacacional.findMany({
      where: { empleado_id: empleadoId },
      orderBy: { numero_periodo: 'desc' },
    });

    const ultimoPeriodo = periodosExistentes[0]?.numero_periodo || 0;
    const periodosCreados: Prisma.PeriodoVacacionalGetPayload<object>[] = [];

    // Crear períodos faltantes
    for (let i = ultimoPeriodo + 1; i <= aniosTrabajados; i++) {
      const fechaInicio = new Date(fechaIngreso);
      fechaInicio.setFullYear(fechaIngreso.getFullYear() + (i - 1));

      const fechaFin = new Date(fechaInicio);
      fechaFin.setFullYear(fechaFin.getFullYear() + 1);
      fechaFin.setDate(fechaFin.getDate() - 1);

      const fechaLimite = new Date(fechaFin);
      fechaLimite.setFullYear(fechaLimite.getFullYear() + 1);

      const periodo = await this.prisma.periodoVacacional.create({
        data: {
          empleado_id: empleadoId,
          empresa_id: empresaId,
          numero_periodo: i,
          fecha_inicio_periodo: fechaInicio,
          fecha_fin_periodo: fechaFin,
          fecha_limite_goce: fechaLimite,
          dias_correspondientes: diasCorrespondientes,
          dias_pendientes: diasCorrespondientes,
          estado: EstadoPeriodoVacacional.DISPONIBLE,
        },
      });

      periodosCreados.push(periodo);
    }

    return {
      message: `Se generaron ${periodosCreados.length} períodos vacacionales`,
      periodos: periodosCreados,
    };
  }

  async getSaldoEmpleado(empleadoId: number, empresaId: number) {
    const periodos = await this.prisma.periodoVacacional.findMany({
      where: {
        empleado_id: empleadoId,
        empresa_id: empresaId,
        estado: {
          in: [
            EstadoPeriodoVacacional.DISPONIBLE,
            EstadoPeriodoVacacional.PARCIAL,
          ],
        },
      },
      orderBy: { numero_periodo: 'asc' },
    });

    const totalDisponible = periodos.reduce(
      (sum, p) => sum + p.dias_pendientes,
      0,
    );

    return {
      periodos,
      total_disponible: totalDisponible,
      total_periodos: periodos.length,
    };
  }

  // ==================== SOLICITUDES (delegadas a VacacionesSolicitudesService) ====================

  async findAllSolicitudes(empresaId: number, filters: FilterSolicitudDto) {
    return this.solicitudesService.findAllSolicitudes(empresaId, filters);
  }

  async findOneSolicitud(id: number, empresaId: number) {
    return this.solicitudesService.findOneSolicitud(id, empresaId);
  }

  async createSolicitud(
    empresaId: number,
    dto: CreateSolicitudDto,
    usuarioId: number,
  ) {
    return this.solicitudesService.createSolicitud(empresaId, dto, usuarioId);
  }

  async aprobarPorJefe(
    id: number,
    empresaId: number,
    dto: AprobarJefeDto,
    usuarioId: number,
  ) {
    return this.solicitudesService.aprobarPorJefe(
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
    return this.solicitudesService.aprobarPorRrhh(
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
    return this.solicitudesService.cancelarSolicitud(
      id,
      empresaId,
      dto,
      usuarioId,
    );
  }

  // ==================== DASHBOARD Y ALERTAS ====================

  async getDashboard(empresaId: number) {
    // C1: Actualizar estados automáticamente al cargar el dashboard
    await this.actualizarEstadosPeriodos(empresaId);

    // Usar zona horaria Peru para calculos
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const en30Dias = sumarDiasPeru(hoy, 30);

    const [
      solicitudesPendientesJefe,
      solicitudesPendientesRrhh,
      enGoceActualmente,
      periodosPorVencer,
      tripleVacacionalPendiente,
    ] = await Promise.all([
      // Solicitudes pendientes de jefe
      this.prisma.solicitudVacaciones.count({
        where: {
          empresa_id: empresaId,
          estado: EstadoSolicitudVacaciones.PENDIENTE_JEFE,
        },
      }),
      // Solicitudes pendientes de RRHH
      this.prisma.solicitudVacaciones.count({
        where: {
          empresa_id: empresaId,
          estado: EstadoSolicitudVacaciones.PENDIENTE_RRHH,
        },
      }),
      // Empleados en goce actualmente
      this.prisma.solicitudVacaciones.count({
        where: {
          empresa_id: empresaId,
          estado: EstadoSolicitudVacaciones.APROBADA,
          fecha_inicio_aprobada: { lte: hoy },
          fecha_fin_aprobada: { gte: hoy },
        },
      }),
      // Períodos por vencer en próximos 30 días
      this.prisma.periodoVacacional.findMany({
        where: {
          empresa_id: empresaId,
          estado: {
            in: [
              EstadoPeriodoVacacional.DISPONIBLE,
              EstadoPeriodoVacacional.PARCIAL,
            ],
          },
          fecha_limite_goce: { lte: en30Dias },
          dias_pendientes: { gt: 0 },
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
        },
        orderBy: { fecha_limite_goce: 'asc' },
      }),
      // Triple vacacional generado (períodos vencidos con días pendientes)
      this.prisma.periodoVacacional.findMany({
        where: {
          empresa_id: empresaId,
          estado: EstadoPeriodoVacacional.VENCIDO,
          pagado_triple: false,
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              sueldo_base: true,
            },
          },
        },
      }),
    ]);

    // Solicitudes recientes
    const solicitudesRecientes = await this.prisma.solicitudVacaciones.findMany(
      {
        where: { empresa_id: empresaId },
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          empleado: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
    );

    return {
      resumen: {
        solicitudes_pendientes_jefe: solicitudesPendientesJefe,
        solicitudes_pendientes_rrhh: solicitudesPendientesRrhh,
        en_goce_actualmente: enGoceActualmente,
        periodos_por_vencer: periodosPorVencer.length,
        triple_vacacional_pendiente: tripleVacacionalPendiente.length,
      },
      alertas: {
        periodos_por_vencer: periodosPorVencer,
        triple_vacacional: tripleVacacionalPendiente,
      },
      solicitudes_recientes: solicitudesRecientes,
    };
  }

  async getAlertasVencimiento(
    empresaId: number,
    diasAnticipacion: number = 30,
  ) {
    // Usar zona horaria Peru para calculos
    const fechaLimite = sumarDiasPeru(ahoraPeru().toJSDate(), diasAnticipacion);

    return this.prisma.periodoVacacional.findMany({
      where: {
        empresa_id: empresaId,
        estado: {
          in: [
            EstadoPeriodoVacacional.DISPONIBLE,
            EstadoPeriodoVacacional.PARCIAL,
          ],
        },
        fecha_limite_goce: { lte: fechaLimite },
        dias_pendientes: { gt: 0 },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            area: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha_limite_goce: 'asc' },
    });
  }

  // ==================== ACTUALIZAR ESTADOS AUTOMÁTICAMENTE ====================

  async actualizarEstadosPeriodos(empresaId: number) {
    // Usar zona horaria Peru para determinar "hoy"
    const hoy = ahoraPeru().startOf('day').toJSDate();

    // Marcar períodos vencidos
    const periodosVencidos = await this.prisma.periodoVacacional.updateMany({
      where: {
        empresa_id: empresaId,
        estado: {
          in: [
            EstadoPeriodoVacacional.DISPONIBLE,
            EstadoPeriodoVacacional.PARCIAL,
          ],
        },
        fecha_limite_goce: { lt: hoy },
        dias_pendientes: { gt: 0 },
      },
      data: {
        estado: EstadoPeriodoVacacional.VENCIDO,
        genera_triple: true,
        fecha_triple: hoy,
      },
    });

    // Marcar solicitudes en goce
    await this.prisma.solicitudVacaciones.updateMany({
      where: {
        empresa_id: empresaId,
        estado: EstadoSolicitudVacaciones.APROBADA,
        fecha_inicio_aprobada: { lte: hoy },
        fecha_fin_aprobada: { gte: hoy },
      },
      data: {
        estado: EstadoSolicitudVacaciones.EN_GOCE,
      },
    });

    // Marcar solicitudes gozadas (terminadas)
    await this.prisma.solicitudVacaciones.updateMany({
      where: {
        empresa_id: empresaId,
        estado: EstadoSolicitudVacaciones.EN_GOCE,
        fecha_fin_aprobada: { lt: hoy },
      },
      data: {
        estado: EstadoSolicitudVacaciones.GOZADA,
      },
    });

    return {
      periodos_vencidos: periodosVencidos.count,
    };
  }
}
