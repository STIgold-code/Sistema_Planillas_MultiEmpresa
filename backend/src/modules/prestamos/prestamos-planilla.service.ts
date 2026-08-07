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
 */
@Injectable()
export class PrestamosPlanillaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Descuentos de préstamos/adelantos por empleado para el mes de la planilla.
   * Aislamiento multiempresa: filtra siempre por `empresa_id`.
   */
  async descuentosPorEmpleado(
    empresaId: number,
    empleadoIds: readonly number[],
    mes: number,
  ): Promise<Map<number, DescuentosPrestamos>> {
    if (empleadoIds.length === 0) return new Map();

    const prestamos = await this.prisma.prestamo.findMany({
      where: {
        empresa_id: empresaId,
        empleado_id: { in: [...empleadoIds] },
        estado: EstadoPrestamo.ACTIVO,
      },
      select: SELECT_PRESTAMO_ACTIVO,
      orderBy: [...ORDEN_AMORTIZACION],
    });

    return agruparDescuentosPorEmpleado(prestamos.map(aPrestamoVigente), mes);
  }
}
