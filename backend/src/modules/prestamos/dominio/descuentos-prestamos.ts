/**
 * Reglas puras del descuento de préstamos y adelantos en la planilla mensual.
 *
 * Dependency Rule: este archivo NO importa Prisma ni NestJS. Recibe primitivas
 * y devuelve montos; el borde de aplicación (servicio Nest) traduce las filas.
 *
 * Reglas de negocio:
 *  - PRESTAMO               → `planilla_detalle.prestamo`
 *  - ADELANTO_SUELDO        → `planilla_detalle.adelanto_quincena`
 *  - ADELANTO_GRATIFICACION → `planilla_detalle.adelanto_gratificacion`, y SOLO
 *    en los meses que pagan gratificación (julio y diciembre, Ley 27735).
 *  - La última cuota nunca excede el saldo: `min(cuota, saldo)`.
 *  - Saldo NULL = cuota recurrente sin monto definido (se descuenta la cuota
 *    completa cada mes hasta que alguien cancela el préstamo manualmente).
 */

/** Tipos de préstamo. Mismos miembros que el enum Prisma `TipoPrestamo`. */
export type TipoPrestamoCalculo =
  | 'PRESTAMO'
  | 'ADELANTO_SUELDO'
  | 'ADELANTO_GRATIFICACION';

/** Meses que pagan gratificación (Ley 27735): julio y diciembre. */
export const MESES_GRATIFICACION: readonly number[] = [7, 12];

/** Préstamo ACTIVO listo para descontar, ya traducido a primitivas. */
export interface PrestamoVigente {
  id: number;
  empleadoId: number;
  tipo: TipoPrestamoCalculo;
  cuotaMensual: number;
  /** Saldo pendiente. NULL = descuento recurrente sin monto definido. */
  saldo: number | null;
}

/** Montos a volcar en el detalle de planilla del empleado. */
export interface DescuentosPrestamos {
  prestamo: number;
  adelantoQuincena: number;
  adelantoGratificacion: number;
}

/** Descuento nulo (empleado sin préstamos activos). */
export const SIN_DESCUENTOS_PRESTAMOS: DescuentosPrestamos = Object.freeze({
  prestamo: 0,
  adelantoQuincena: 0,
  adelantoGratificacion: 0,
});

const redondear2 = (valor: number): number => {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isFinite(redondeado) ? redondeado : 0;
};

/**
 * Cuota que corresponde descontar este mes. La última cuota se topa al saldo
 * para no cobrar de más (saldo 150 con cuota 100 → 100 y después 50).
 */
export function cuotaEfectiva(prestamo: PrestamoVigente): number {
  const cuota = Math.max(0, redondear2(prestamo.cuotaMensual));
  if (prestamo.saldo === null || prestamo.saldo === undefined) return cuota;
  const saldo = Math.max(0, redondear2(prestamo.saldo));
  return Math.min(cuota, saldo);
}

/** True si el tipo de préstamo descuenta en el mes de la planilla. */
export function descuentaEnMes(
  tipo: TipoPrestamoCalculo,
  mes: number,
): boolean {
  if (tipo === 'ADELANTO_GRATIFICACION') {
    return MESES_GRATIFICACION.includes(mes);
  }
  return true;
}

/**
 * Suma las cuotas de los préstamos activos de UN empleado y las rutea al campo
 * del detalle que corresponde a cada tipo.
 */
export function calcularDescuentosPrestamos(
  prestamos: readonly PrestamoVigente[],
  mes: number,
): DescuentosPrestamos {
  const acumulado: DescuentosPrestamos = {
    prestamo: 0,
    adelantoQuincena: 0,
    adelantoGratificacion: 0,
  };

  for (const prestamo of prestamos) {
    if (!descuentaEnMes(prestamo.tipo, mes)) continue;

    const cuota = cuotaEfectiva(prestamo);
    if (cuota <= 0) continue;

    if (prestamo.tipo === 'PRESTAMO') {
      acumulado.prestamo = redondear2(acumulado.prestamo + cuota);
    } else if (prestamo.tipo === 'ADELANTO_SUELDO') {
      acumulado.adelantoQuincena = redondear2(
        acumulado.adelantoQuincena + cuota,
      );
    } else {
      acumulado.adelantoGratificacion = redondear2(
        acumulado.adelantoGratificacion + cuota,
      );
    }
  }

  return acumulado;
}

/**
 * Agrupa los préstamos activos por empleado y calcula el descuento de cada uno.
 * Solo aparecen en el mapa los empleados con al menos un préstamo recibido.
 */
export function agruparDescuentosPorEmpleado(
  prestamos: readonly PrestamoVigente[],
  mes: number,
): Map<number, DescuentosPrestamos> {
  const porEmpleado = new Map<number, PrestamoVigente[]>();

  for (const prestamo of prestamos) {
    const acumulados = porEmpleado.get(prestamo.empleadoId);
    if (acumulados) {
      acumulados.push(prestamo);
    } else {
      porEmpleado.set(prestamo.empleadoId, [prestamo]);
    }
  }

  const resultado = new Map<number, DescuentosPrestamos>();
  for (const [empleadoId, deEmpleado] of porEmpleado) {
    resultado.set(empleadoId, calcularDescuentosPrestamos(deEmpleado, mes));
  }
  return resultado;
}
