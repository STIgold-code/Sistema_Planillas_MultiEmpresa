/**
 * Concepto régimen-variable: CONAFOVICER (construcción civil).
 *
 * Aporte del 2% al Comité de Administración del Fondo de Construcción de Vivienda
 * y Centros Recreacionales. A diferencia de EsSalud (aporte del empleador), el
 * CONAFOVICER se DESCUENTA al trabajador (lo retiene el empleador y deposita).
 * Por eso es un concepto propio de tipo `descuento`.
 *
 * ✅ CONFIRMADO: tasa 2% y que es descuento al trabajador.
 * ⚠️ NO CONFIRMADO: la BASE de cálculo (jornal básico vs remuneración total).
 *   Por eso la base llega ya resuelta como `baseImponible` desde la estrategia;
 *   cambiar la base es un cambio de DATO/decisión del contador, no de este código.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_CONAFOVICER = 'conafovicer';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaConafovicer {
  /** Base imponible resuelta por la estrategia (⚠️ jornal básico vs total). */
  baseImponible: number;
  /** Tasa CONAFOVICER (✅ 0.02). */
  conafovicerPorcentaje: number;
}

export function calcularConafovicer(
  entrada: EntradaConafovicer,
): ResultadoConcepto {
  if (entrada.baseImponible <= 0) return { conceptos: [] };

  const monto = redondear2(
    entrada.baseImponible * entrada.conafovicerPorcentaje,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_CONAFOVICER,
    descripcion: 'CONAFOVICER (descuento trabajador)',
    tipo: 'descuento',
    monto,
  };
  return { conceptos: [concepto] };
}
