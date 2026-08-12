import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { round2, safeNumber } from './planillas.config';

/**
 * Promedios históricos de los últimos 6 meses que alimentan el cálculo de CTS y
 * gratificación. (Antes vivía en el motor legacy `calcular-empleado.ts`, ya
 * retirado.)
 */
export interface PromediosHistoricos {
  promedioHorasExtras: number;
  promedioComisiones: number;
  promedioBonificaciones: number;
  mesesTrabajadosSemestre: number;
  diasTrabajadosSemestre: number;
  ultimaGratificacion: number;
  /**
   * Días NO considerados tiempo efectivamente laborado (faltas, suspensión y
   * licencia sin goce) por MES CALENDARIO del año del período, tomados de las
   * planillas ya guardadas. Deducen la gratificación a razón de un treintavo
   * del sexto (D.S. 005-2002-TR art. 3.4). Solo se indexan meses del MISMO año
   * que el período: el semestre de gratificación (enero-junio o julio-diciembre)
   * nunca cruza el año, así que un mes de diciembre del año anterior no debe
   * confundirse con el diciembre en curso.
   */
  diasNoLaboradosPorMes: Record<number, number>;
}

/**
 * Calcula los promedios históricos (últimos 6 meses) que alimentan CTS y
 * gratificación: promedio de horas extras, bonificaciones, meses trabajados en
 * el semestre, última gratificación y los días NO laborados por mes del año
 * (deducción en treintavos de la gratificación, D.S. 005-2002-TR art. 3.4).
 * Extraído de PlanillasCalcularService para mantener el servicio por debajo de
 * 500 LOC (SRP).
 *
 * La ventana de 6 meses previos alcanza para todos los usos: la gratificación
 * de julio necesita enero-junio (los 6 previos), la de diciembre julio-noviembre
 * (5 previos) y la trunca, a lo sumo, desde el inicio del semestre del cese.
 */
@Injectable()
export class PlanillaPromediosService {
  constructor(private prisma: PrismaService) {}

  async obtener(
    empleadoId: number,
    empresaId: number,
    mes: number,
    anio: number,
  ): Promise<PromediosHistoricos> {
    const mesesAnteriores: { mes: number; anio: number }[] = [];
    let mesTemp = mes;
    let anioTemp = anio;

    for (let i = 0; i < 6; i++) {
      mesTemp--;
      if (mesTemp < 1) {
        mesTemp = 12;
        anioTemp--;
      }
      mesesAnteriores.push({ mes: mesTemp, anio: anioTemp });
    }

    const detallesAnteriores = await this.prisma.planillaDetalle.findMany({
      where: {
        empleado_id: empleadoId,
        planilla: {
          empresa_id: empresaId,
          estado: { in: ['CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA'] },
          OR: mesesAnteriores.map((m) => ({ mes: m.mes, anio: m.anio })),
        },
      },
      select: {
        horas_extras: true,
        horas_extras_25: true,
        horas_extras_35: true,
        bonificaciones: true,
        bonificacion_nocturna: true,
        gratificacion_monto: true,
        dias_trabajados: true,
        dias_falta: true,
        dias_suspension: true,
        dias_licencia_sin_goce: true,
        planilla: { select: { mes: true, anio: true } },
      },
      orderBy: { planilla: { created_at: 'desc' } },
    });

    let totalHorasExtras = 0;
    let totalBonificaciones = 0;
    let mesesConDatos = 0;
    let ultimaGratificacion = 0;
    const diasNoLaboradosPorMes: Record<number, number> = {};

    for (const detalle of detallesAnteriores) {
      if (detalle.planilla.anio === anio) {
        // Ausencias SIN GOCE. Los subsidios, el descanso vacacional y las
        // licencias CON goce se asimilan a tiempo laborado (D.S. 005-2002-TR
        // art. 2), así que no entran.
        diasNoLaboradosPorMes[detalle.planilla.mes] =
          (diasNoLaboradosPorMes[detalle.planilla.mes] ?? 0) +
          safeNumber(detalle.dias_falta) +
          safeNumber(detalle.dias_suspension) +
          safeNumber(detalle.dias_licencia_sin_goce);
      }

      const he =
        safeNumber(detalle.horas_extras) ||
        safeNumber(detalle.horas_extras_25) +
          safeNumber(detalle.horas_extras_35);
      totalHorasExtras += he;
      totalBonificaciones +=
        safeNumber(detalle.bonificaciones) +
        safeNumber(detalle.bonificacion_nocturna);
      mesesConDatos++;

      if (
        (detalle.planilla.mes === 7 || detalle.planilla.mes === 12) &&
        safeNumber(detalle.gratificacion_monto) > 0
      ) {
        if (ultimaGratificacion === 0) {
          ultimaGratificacion = safeNumber(detalle.gratificacion_monto);
        }
      }
    }

    const promedioHorasExtras =
      mesesConDatos > 0 ? round2(totalHorasExtras / mesesConDatos) : 0;
    const promedioBonificaciones =
      mesesConDatos > 0 ? round2(totalBonificaciones / mesesConDatos) : 0;
    const mesesTrabajadosSemestre = Math.min(mesesConDatos, 6);

    return {
      promedioHorasExtras,
      promedioComisiones: 0,
      promedioBonificaciones,
      mesesTrabajadosSemestre,
      diasTrabajadosSemestre: 0,
      ultimaGratificacion,
      diasNoLaboradosPorMes,
    };
  }
}
