import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePeriodoDto, UpdatePeriodoDto, FilterPeriodoDto } from './dto';
import { Prisma, EstadoPeriodoTareo } from '@prisma/client';
import { ahoraPeru } from '../../common/utils/datetime.util';

@Injectable()
export class PeriodosService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number, filters: FilterPeriodoDto) {
    const { anio, mes, estado, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PeriodoTareoWhereInput = {
      empresa_id: empresaId,
    };

    if (anio) where.anio = anio;
    if (mes) where.mes = mes;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.periodoTareo.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
        include: {
          _count: { select: { tareos: true } },
          usuario_cierre: { select: { id: true, nombre_completo: true } },
        },
      }),
      this.prisma.periodoTareo.count({ where }),
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

  async findOne(id: number, empresaId: number) {
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        _count: { select: { tareos: true } },
        usuario_cierre: { select: { id: true, nombre_completo: true } },
      },
    });

    if (!periodo) {
      throw new NotFoundException('Periodo no encontrado');
    }

    return periodo;
  }

  async create(empresaId: number, dto: CreatePeriodoDto) {
    // Verificar que no exista periodo para ese mes/año
    const exists = await this.prisma.periodoTareo.findFirst({
      where: {
        empresa_id: empresaId,
        anio: dto.anio,
        mes: dto.mes,
      },
    });

    if (exists) {
      throw new ConflictException(
        `Ya existe un periodo para ${dto.mes}/${dto.anio}`,
      );
    }

    // Calcular fechas inicio y fin del mes
    const fecha_inicio = new Date(dto.anio, dto.mes - 1, 1);
    const fecha_fin = new Date(dto.anio, dto.mes, 0); // Último día del mes

    return this.prisma.periodoTareo.create({
      data: {
        empresa_id: empresaId,
        anio: dto.anio,
        mes: dto.mes,
        fecha_inicio,
        fecha_fin,
        observaciones: dto.observaciones,
      },
    });
  }

  async update(id: number, empresaId: number, dto: UpdatePeriodoDto) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('No se puede modificar un periodo cerrado');
    }

    return this.prisma.periodoTareo.update({
      where: { id },
      data: dto,
    });
  }

  async generarTareos(id: number, empresaId: number) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado !== EstadoPeriodoTareo.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden generar tareos en periodos en estado BORRADOR',
      );
    }

    // Obtener empleados con contrato que cubra el período
    // Incluye PENDIENTE/CESADO para registrar asistencia de días trabajados antes del cese
    const fechaInicioPeriodo = new Date(periodo.anio, periodo.mes - 1, 1);
    const fechaFinPeriodo = new Date(periodo.anio, periodo.mes, 0);

    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] },
        contratos: {
          some: {
            estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
            fecha_inicio: { lte: fechaFinPeriodo },
            OR: [
              { fecha_fin: null },
              { fecha_fin: { gte: fechaInicioPeriodo } },
            ],
          },
        },
      },
      select: {
        id: true,
        area_id: true,
        sede_id: true,
        cargo_id: true,
      },
    });

    if (empleados.length === 0) {
      throw new BadRequestException(
        'No hay empleados con contrato en este período para generar tareos',
      );
    }

    // Calcular días del mes
    const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

    // Obtener IDs de empleados que ya tienen tareo
    const tareosExistentes = await this.prisma.tareo.findMany({
      where: { periodo_id: id },
      select: { empleado_id: true },
    });
    const empleadosConTareo = new Set(
      tareosExistentes.map((t) => t.empleado_id),
    );

    // Filtrar solo empleados sin tareo
    const empleadosSinTareo = empleados.filter(
      (e) => !empleadosConTareo.has(e.id),
    );

    if (empleadosSinTareo.length === 0) {
      // Cambiar estado a EN_PROCESO si no hay nuevos tareos que crear
      await this.prisma.periodoTareo.update({
        where: { id },
        data: { estado: EstadoPeriodoTareo.EN_PROCESO },
      });
      return {
        message: `No hay nuevos tareos que generar. ${tareosExistentes.length} empleados ya tienen tareo.`,
        empleados: tareosExistentes.length,
      };
    }

    // Procesar en lotes para evitar timeout de transacción
    const BATCH_SIZE = 50;
    for (let i = 0; i < empleadosSinTareo.length; i += BATCH_SIZE) {
      const batch = empleadosSinTareo.slice(i, i + BATCH_SIZE);

      await this.prisma.$transaction(
        async (tx) => {
          for (const empleado of batch) {
            // Crear tareo
            const tareo = await tx.tareo.create({
              data: {
                periodo_id: id,
                empleado_id: empleado.id,
                area_id: empleado.area_id,
                sede_id: empleado.sede_id,
                cargo_id: empleado.cargo_id,
              },
            });

            // Crear detalles (31 días máximo)
            const detalles = [];
            for (let dia = 1; dia <= diasDelMes; dia++) {
              detalles.push({
                tareo_id: tareo.id,
                dia,
              });
            }

            await tx.tareoDetalle.createMany({ data: detalles });
          }
        },
        {
          maxWait: 10000, // 10 segundos máximo de espera
          timeout: 60000, // 60 segundos de timeout por batch
        },
      );
    }

    // Cambiar estado a EN_PROCESO
    await this.prisma.periodoTareo.update({
      where: { id },
      data: { estado: EstadoPeriodoTareo.EN_PROCESO },
    });

    return {
      message: `Se generaron tareos para ${empleados.length} empleados`,
      empleados: empleados.length,
    };
  }

  async cerrar(id: number, empresaId: number, usuarioId: number) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('El periodo ya está cerrado');
    }

    if (periodo.estado === EstadoPeriodoTareo.BORRADOR) {
      throw new BadRequestException(
        'Debe generar los tareos antes de cerrar el periodo',
      );
    }

    return this.prisma.periodoTareo.update({
      where: { id },
      data: {
        estado: EstadoPeriodoTareo.CERRADO,
        fecha_cierre: ahoraPeru().toJSDate(),
        cerrado_por: usuarioId,
      },
    });
  }

  async reabrir(id: number, empresaId: number, usuarioId?: number) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado !== EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('Solo se pueden reabrir periodos cerrados');
    }

    // VALIDACIÓN: No permitir reabrir si hay una planilla calculada/aprobada/pagada para este periodo
    const planillaExistente = await this.prisma.planilla.findFirst({
      where: {
        empresa_id: empresaId,
        periodo_tareo_id: id,
        estado: { in: ['CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA'] },
      },
      select: { id: true, mes: true, anio: true, estado: true },
    });

    if (planillaExistente) {
      throw new BadRequestException(
        `No se puede reabrir el período de tareo porque existe una planilla ${planillaExistente.mes}/${planillaExistente.anio} en estado ${planillaExistente.estado}. Primero debe anular o eliminar la planilla.`,
      );
    }

    return this.prisma.periodoTareo.update({
      where: { id },
      data: {
        estado: EstadoPeriodoTareo.EN_PROCESO,
        fecha_cierre: null,
        cerrado_por: null,
      },
    });
  }

  async eliminar(id: number, empresaId: number) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException(
        'No se puede eliminar un periodo cerrado. Reábralo primero si desea eliminarlo.',
      );
    }

    const planillaBloqueada = await this.prisma.planilla.findFirst({
      where: {
        periodo_tareo_id: id,
        estado: { in: ['APROBADA', 'PAGADA'] },
      },
    });

    if (planillaBloqueada) {
      throw new BadRequestException(
        'No se puede eliminar: tiene una planilla aprobada o pagada asociada.',
      );
    }

    const tareosCount = periodo._count.tareos;

    await this.prisma.periodoTareo.delete({ where: { id } });

    return {
      mensaje: `Periodo ${periodo.mes}/${periodo.anio} eliminado exitosamente`,
      tareosEliminados: tareosCount,
    };
  }

  async sincronizarEmpleados(id: number, empresaId: number) {
    const periodo = await this.findOne(id, empresaId);

    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('No se puede modificar un periodo cerrado');
    }

    if (periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException('No se puede modificar un periodo anulado');
    }

    // Obtener empleados con contrato que cubra el período
    const fechaInicioPeriodo = new Date(periodo.anio, periodo.mes - 1, 1);
    const fechaFinPeriodo = new Date(periodo.anio, periodo.mes, 0);

    const empleadosActivos = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] },
        contratos: {
          some: {
            estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
            fecha_inicio: { lte: fechaFinPeriodo },
            OR: [
              { fecha_fin: null },
              { fecha_fin: { gte: fechaInicioPeriodo } },
            ],
          },
        },
      },
      select: {
        id: true,
        area_id: true,
        sede_id: true,
        cargo_id: true,
      },
    });

    // Obtener empleados que ya tienen tareo en este periodo
    const tareosExistentes = await this.prisma.tareo.findMany({
      where: { periodo_id: id },
      select: { empleado_id: true },
    });

    const empleadosConTareo = new Set(
      tareosExistentes.map((t) => t.empleado_id),
    );

    // Filtrar empleados que no tienen tareo
    const empleadosFaltantes = empleadosActivos.filter(
      (e) => !empleadosConTareo.has(e.id),
    );

    if (empleadosFaltantes.length === 0) {
      return {
        message:
          'Todos los empleados con contrato en el período ya tienen tareo asignado',
        agregados: 0,
        total_empleados: tareosExistentes.length,
      };
    }

    // Calcular días del mes
    const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

    // Procesar en lotes para evitar timeout de transacción
    const BATCH_SIZE = 50;
    for (let i = 0; i < empleadosFaltantes.length; i += BATCH_SIZE) {
      const batch = empleadosFaltantes.slice(i, i + BATCH_SIZE);

      await this.prisma.$transaction(
        async (tx) => {
          for (const empleado of batch) {
            // Crear tareo
            const tareo = await tx.tareo.create({
              data: {
                periodo_id: id,
                empleado_id: empleado.id,
                area_id: empleado.area_id,
                sede_id: empleado.sede_id,
                cargo_id: empleado.cargo_id,
              },
            });

            // Crear detalles para cada día
            const detalles = [];
            for (let dia = 1; dia <= diasDelMes; dia++) {
              detalles.push({
                tareo_id: tareo.id,
                dia,
              });
            }

            await tx.tareoDetalle.createMany({ data: detalles });
          }
        },
        {
          maxWait: 10000, // 10 segundos máximo de espera
          timeout: 60000, // 60 segundos de timeout por batch
        },
      );
    }

    // Si estaba en BORRADOR, cambiar a EN_PROCESO
    if (periodo.estado === EstadoPeriodoTareo.BORRADOR) {
      await this.prisma.periodoTareo.update({
        where: { id },
        data: { estado: EstadoPeriodoTareo.EN_PROCESO },
      });
    }

    return {
      message: `Se agregaron ${empleadosFaltantes.length} empleados al tareo`,
      agregados: empleadosFaltantes.length,
      total_empleados: tareosExistentes.length + empleadosFaltantes.length,
    };
  }

  async getResumen(id: number, empresaId: number) {
    const periodo = await this.findOne(id, empresaId);

    // Estadísticas generales
    const [totalTareos, tareosPorEstado, marcacionesPorTipo] =
      await Promise.all([
        this.prisma.tareo.count({ where: { periodo_id: id } }),
        this.prisma.tareo.groupBy({
          by: ['estado'],
          where: { periodo_id: id },
          _count: true,
        }),
        this.prisma.tareoDetalle.groupBy({
          by: ['tipo_marcacion_id'],
          where: {
            tareo: { periodo_id: id },
            tipo_marcacion_id: { not: null },
          },
          _count: true,
        }),
      ]);

    // Obtener nombres de tipos de marcación
    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, descripcion: true },
    });

    const marcacionesMap = new Map(tiposMarcacion.map((t) => [t.id, t]));

    const resumenMarcaciones = marcacionesPorTipo.map((m) => ({
      tipo_id: m.tipo_marcacion_id,
      codigo: marcacionesMap.get(m.tipo_marcacion_id)?.codigo || 'N/A',
      descripcion:
        marcacionesMap.get(m.tipo_marcacion_id)?.descripcion || 'N/A',
      cantidad: m._count,
    }));

    return {
      periodo,
      estadisticas: {
        total_empleados: totalTareos,
        por_estado: tareosPorEstado.reduce(
          (acc, curr) => ({ ...acc, [curr.estado]: curr._count }),
          {},
        ),
        marcaciones: resumenMarcaciones,
      },
    };
  }
}
