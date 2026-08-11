import { Injectable } from '@nestjs/common';
import { EstadoPrestamo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DescuentosPrestamos,
  agruparDescuentosPorEmpleado,
} from './dominio/descuentos-prestamos';
import {
  ORDEN_AMORTIZACION,
  SELECT_PRESTAMO_ACTIVO,
  aPrestamoVigente,
} from './prestamos.mapper';

/**
 * Puerto de lectura que consume el CÁLCULO de planilla.
 *
 * Antes de este módulo los descuentos de préstamo/adelanto se cargaban a mano
 * en `planilla_detalle` y el recálculo completo los borraba. Ahora el cálculo
 * consulta aquí los préstamos ACTIVOS del período y el monto se regenera solo.
 *
 * AQUÍ vive el ÚNICO acoplamiento temporal del módulo: el alta de un préstamo
 * es libre (es un acuerdo financiero que nace al firmarse), pero la cuota solo
 * entra a partir de la primera planilla cuyo período lo alcance.
 */
@Injectable()
export class PrestamosPlanillaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Descuentos de préstamos/adelantos por empleado para el período de planilla.
   *
   * Aislamiento multiempresa: filtra siempre por `empresa_id`.
   *
   * Regla temporal: un préstamo otorgado DESPUÉS del fin de la ventana del
   * período no descuenta en ese período — nunca se retro-descuenta. Se compara
   * contra `fechaFinPeriodo` (fin real de la ventana de tareo, que con día de
   * corte NO coincide con el fin del mes calendario), no contra `mes`.
   */
  async descuentosPorEmpleado(
    empresaId: number,
    empleadoIds: readonly number[],
    mes: number,
    fechaFinPeriodo: Date,
  ): Promise<Map<number, DescuentosPrestamos>> {
    if (empleadoIds.length === 0) return new Map();

    const prestamos = await this.prisma.prestamo.findMany({
      where: {
        empresa_id: empresaId,
        empleado_id: { in: [...empleadoIds] },
        estado: EstadoPrestamo.ACTIVO,
        // Borde inclusivo: otorgado EL último día del período sí descuenta.
        fecha_otorgado: { lte: fechaFinPeriodo },
      },
      select: SELECT_PRESTAMO_ACTIVO,
      orderBy: [...ORDEN_AMORTIZACION],
    });

    return agruparDescuentosPorEmpleado(prestamos.map(aPrestamoVigente), mes);
  }
}
