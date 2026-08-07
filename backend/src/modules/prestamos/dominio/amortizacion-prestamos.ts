/**
 * Reglas puras del reparto de un descuento de planilla entre los préstamos
 * activos del trabajador (amortización al APROBAR la planilla).
 *
 * El detalle de planilla guarda un monto AGREGADO por tipo (`prestamo`,
 * `adelanto_quincena`, `adelanto_gratificacion`) y admite edición manual como
 * override puntual. Al aprobar hay que repartir ese agregado entre los préstamos
 * que lo originaron, en orden determinista (el más antiguo primero), sin exceder
 * la cuota efectiva de cada uno.
 *
 * Si el monto del detalle supera la suma de cuotas (override manual al alza), el
 * excedente NO se imputa a ningún préstamo: es un descuento manual sin respaldo
 * en una deuda registrada y amortizarlo falsearía el saldo.
 *
 * Dependency Rule: sin Prisma ni NestJS.
 */
import { PrestamoVigente, cuotaEfectiva } from './descuentos-prestamos';

/** Cargo a registrar contra un préstamo concreto. */
export interface CargoAmortizacion {
  prestamoId: number;
  monto: number;
  /** Saldo después del cargo. NULL si el préstamo no lleva saldo (recurrente). */
  saldoResultante: number | null;
  /** True si el préstamo queda cancelado (saldo agotado) y pasa a PAGADO. */
  quedaPagado: boolean;
}

const redondear2 = (valor: number): number => {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isFinite(redondeado) ? redondeado : 0;
};

/**
 * Reparte `montoAplicado` entre los préstamos dados, en el orden recibido.
 * Devuelve solo los préstamos que reciben un cargo mayor a cero.
 */
export function repartirCargo(
  prestamos: readonly PrestamoVigente[],
  montoAplicado: number,
): CargoAmortizacion[] {
  let restante = Math.max(0, redondear2(montoAplicado));
  if (restante === 0) return [];

  const cargos: CargoAmortizacion[] = [];

  for (const prestamo of prestamos) {
    if (restante <= 0) break;

    const cuota = cuotaEfectiva(prestamo);
    if (cuota <= 0) continue;

    const monto = redondear2(Math.min(cuota, restante));
    if (monto <= 0) continue;

    const tieneSaldo = prestamo.saldo !== null && prestamo.saldo !== undefined;
    const saldoResultante = tieneSaldo
      ? Math.max(0, redondear2((prestamo.saldo ?? 0) - monto))
      : null;

    cargos.push({
      prestamoId: prestamo.id,
      monto,
      saldoResultante,
      quedaPagado: saldoResultante !== null && saldoResultante === 0,
    });

    restante = redondear2(restante - monto);
  }

  return cargos;
}
