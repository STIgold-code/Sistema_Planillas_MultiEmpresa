import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculoWarning } from './planillas-calcular.service';

/**
 * Carga Prisma y validaciones de advertencia para el cálculo de planilla.
 *
 * Aísla las consultas (período de tareo, empleados con tareo/contrato/régimen,
 * acumulados de IR) y la recolección de warnings del servicio orquestador, para
 * mantenerlo por debajo de 500 LOC (SRP). No calcula montos: solo carga y valida.
 */
@Injectable()
export class PlanillaCargaService {
  constructor(private prisma: PrismaService) {}

  async resolverPeriodoTareo(
    planilla: { periodo_tareo_id: number | null; anio: number; mes: number },
    empresaId: number,
  ): Promise<{ periodoTareoId: number | null; warningsPlanilla: string[] }> {
    let periodoTareoId = planilla.periodo_tareo_id;
    let periodoTareo: { id: number; estado: string } | null = null;

    if (!periodoTareoId) {
      periodoTareo = await this.prisma.periodoTareo.findFirst({
        where: {
          empresa_id: empresaId,
          anio: planilla.anio,
          mes: planilla.mes,
        },
      });
      periodoTareoId = periodoTareo?.id || null;
    } else {
      // Multi-tenant: el período debe pertenecer a la misma empresa. Nunca usar
      // un período ajeno (IDOR cross-tenant). Si el id apunta a otra empresa,
      // findFirst devuelve null y abortamos por inconsistencia.
      periodoTareo = await this.prisma.periodoTareo.findFirst({
        where: { id: periodoTareoId, empresa_id: empresaId },
      });

      if (!periodoTareo) {
        throw new BadRequestException(
          `El período de tareo ${periodoTareoId} no existe o no pertenece a la empresa. ` +
            `No se puede calcular la planilla con un período ajeno.`,
        );
      }
    }

    if (periodoTareo && periodoTareo.estado !== 'CERRADO') {
      throw new BadRequestException(
        `El período de tareo de ${planilla.mes}/${planilla.anio} debe estar CERRADO antes de calcular la planilla. Estado actual: ${periodoTareo.estado}`,
      );
    }

    const warningsPlanilla: string[] = [];
    if (!periodoTareo) {
      warningsPlanilla.push(
        `No existe período de tareo para ${planilla.mes}/${planilla.anio}. Los cálculos de días, horas extras y feriados pueden ser incorrectos.`,
      );
    }

    return { periodoTareoId, warningsPlanilla };
  }

  cargarEmpleados(
    empresaId: number,
    periodoTareoId: number | null,
    fechaInicioPeriodo: Date,
    fechaFinPeriodo: Date,
  ) {
    const tareoWhere = periodoTareoId ? { periodo_id: periodoTareoId } : {};

    return this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] },
        NOT: { tipo_pago: 'RECIBO' },
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
      include: {
        regimen_pensionario: true,
        banco_haberes: true,
        contratos: {
          where: {
            estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
            fecha_inicio: { lte: fechaFinPeriodo },
            OR: [
              { fecha_fin: null },
              { fecha_fin: { gte: fechaInicioPeriodo } },
            ],
          },
          orderBy: { fecha_inicio: 'desc' },
          take: 1,
        },
        tareos: {
          where: tareoWhere,
          include: { detalles: { include: { tipo_marcacion: true } } },
        },
      },
    });
  }

  async cargarAcumuladosIR(
    empleadoIds: number[],
    empresaId: number,
    anio: number,
    mes: number,
  ): Promise<
    Map<
      number,
      { remuneracionAcumulada: number; retencionesAcumuladas: number }
    >
  > {
    const acumuladosIR = await this.prisma.planillaDetalle.groupBy({
      by: ['empleado_id'],
      where: {
        empleado_id: { in: empleadoIds },
        planilla: {
          empresa_id: empresaId,
          anio,
          mes: { lt: mes },
          estado: { in: ['CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA'] },
        },
      },
      _sum: { remuneracion_afecta: true, renta_5ta: true },
    });

    const mapa = new Map<
      number,
      { remuneracionAcumulada: number; retencionesAcumuladas: number }
    >();
    for (const acum of acumuladosIR) {
      mapa.set(acum.empleado_id, {
        remuneracionAcumulada: Number(acum._sum.remuneracion_afecta) || 0,
        retencionesAcumuladas: Number(acum._sum.renta_5ta) || 0,
      });
    }
    return mapa;
  }

  detalleSinTareo(
    planillaId: number,
    empleadoId: number,
  ): Prisma.PlanillaDetalleCreateManyInput {
    return {
      planilla_id: planillaId,
      empleado_id: empleadoId,
      total_dias: 0,
      dias_trabajados: 0,
      dias_falta: 0,
      dias_vacaciones: 0,
      dias_licencia_sin_goce: 0,
      dias_licencia_con_goce: 0,
      dias_licencia_fallecimiento: 0,
      dias_licencia_paternidad: 0,
      dias_descanso_medico: 0,
      dias_subsidio_incapacidad: 0,
      dias_subsidio_maternidad: 0,
      dias_suspension: 0,
      turno_dia: 0,
      turno_noche: 0,
      horas_8: 0,
      cantidad_feriados: 0,
      rem_basica: 0,
      total_sueldo_estructura: 0,
      haber_mensual: 0,
      total_ingresos: 0,
      total_descuentos: 0,
      neto_pagar: 0,
      remuneracion_afecta: 0,
      observaciones: 'SIN TAREO REGISTRADO',
    };
  }

  recolectarWarnings(
    empleado: {
      id: number;
      nombres: string;
      apellido_paterno: string;
      regimen_pensionario: unknown;
      sueldo_base: unknown;
    },
    detallesTareo: {
      dia: number;
      horas: Prisma.Decimal | null;
      tipo_marcacion_id: number | null;
      tipo_marcacion: { es_laborable: boolean } | null;
    }[],
    planilla: { anio: number; mes: number },
    warnings: CalculoWarning[],
  ): void {
    const nombreEmpleado = `${empleado.nombres} ${empleado.apellido_paterno}`;

    if (!empleado.regimen_pensionario) {
      warnings.push({
        empleadoId: empleado.id,
        empleadoNombre: nombreEmpleado,
        tipo: 'SIN_REGIMEN',
        mensaje: 'Empleado sin régimen pensionario configurado',
      });
    }

    if ((Number(empleado.sueldo_base) || 0) <= 0) {
      warnings.push({
        empleadoId: empleado.id,
        empleadoNombre: nombreEmpleado,
        tipo: 'SUELDO_CERO',
        mensaje: 'Empleado con sueldo base cero o no configurado',
      });
    }

    const diasDelMesActual = new Date(planilla.anio, planilla.mes, 0).getDate();
    const diasConDetalle = detallesTareo.length;
    if (diasConDetalle < diasDelMesActual) {
      const diasFaltantes = diasDelMesActual - diasConDetalle;
      warnings.push({
        empleadoId: empleado.id,
        empleadoNombre: nombreEmpleado,
        tipo: 'TAREO_INCOMPLETO',
        mensaje: `Tareo incompleto: tiene ${diasConDetalle} días de ${diasDelMesActual}. Faltan ${diasFaltantes} días por marcar.`,
      });
    }

    const diasSinMarcacion = detallesTareo.filter(
      (d) => !d.tipo_marcacion_id && !d.tipo_marcacion,
    );
    if (diasSinMarcacion.length > 0) {
      const diasAfectados = diasSinMarcacion.map((d) => d.dia).join(', ');
      warnings.push({
        empleadoId: empleado.id,
        empleadoNombre: nombreEmpleado,
        tipo: 'DIAS_SIN_MARCACION',
        mensaje: `${diasSinMarcacion.length} día(s) sin tipo de marcación: días ${diasAfectados}. Estos días serán ignorados en el cálculo.`,
      });
    }

    const diasLaborablesSinHoras = detallesTareo.filter(
      (d) =>
        d.tipo_marcacion?.es_laborable &&
        (d.horas === null || Number(d.horas) === 0),
    );
    if (diasLaborablesSinHoras.length > 0) {
      const diasAfectados = diasLaborablesSinHoras.map((d) => d.dia).join(', ');
      warnings.push({
        empleadoId: empleado.id,
        empleadoNombre: nombreEmpleado,
        tipo: 'HORAS_CERO',
        mensaje: `${diasLaborablesSinHoras.length} día(s) laborable(s) con horas = 0: días ${diasAfectados}. No se calcularán horas extras para estos días.`,
      });
    }
  }
}
