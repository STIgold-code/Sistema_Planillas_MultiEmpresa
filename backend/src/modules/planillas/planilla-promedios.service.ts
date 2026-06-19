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
}

/**
 * Calcula los promedios históricos (últimos 6 meses) que alimentan CTS y
 * gratificación: promedio de horas extras, bonificaciones, meses trabajados en
 * el semestre y última gratificación. Extraído de PlanillasCalcularService para
 * mantener el servicio por debajo de 500 LOC (SRP).
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
        planilla: { select: { mes: true, anio: true } },
      },
      orderBy: { planilla: { created_at: 'desc' } },
    });

    let totalHorasExtras = 0;
    let totalBonificaciones = 0;
    let mesesConDatos = 0;
    let ultimaGratificacion = 0;

    for (const detalle of detallesAnteriores) {
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
    };
  }
}
