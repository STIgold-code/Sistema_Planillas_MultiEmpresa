import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { exportarPlanilla } from './planilla-exportacion';
import { FilterPlanillaDto } from './dto';
import { ahoraPeru } from '../../common/utils/datetime.util';

/**
 * Select compartido del empleado para findOne y findOneDetalles. Se extrae a una
 * constante module-level para evitar duplicación y garantizar un shape idéntico
 * en ambas consultas.
 */
const EMPLEADO_SELECT = {
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
} satisfies Prisma.EmpleadoSelect;

/**
 * Responsabilidades de LECTURA de planillas (SRP / tamaño de archivo).
 * Extraído de PlanillasService: listados, detalle, resumen, exportación y la
 * consulta ligera findOneSimple (compartida por servicios de transición/cálculo).
 */
@Injectable()
export class PlanillaConsultaService {
  constructor(private prisma: PrismaService) {}

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
                select: EMPLEADO_SELECT,
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
            select: EMPLEADO_SELECT,
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
  async findOneSimple(id: number, empresaId: number) {
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
