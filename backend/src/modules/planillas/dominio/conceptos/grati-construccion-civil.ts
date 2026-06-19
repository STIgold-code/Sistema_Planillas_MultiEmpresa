/**
 * Concepto régimen-variable: gratificación de CONSTRUCCIÓN CIVIL.
 *
 * A diferencia del régimen general (proporción de un sueldo mensual), la
 * gratificación de construcción civil se calcula en NÚMERO DE JORNALES BÁSICOS:
 *   - Fiestas Patrias = 40 jornales básicos (se devenga 1/7 por mes, ene-jul).
 *   - Navidad        = 40 jornales básicos (se devenga 1/5 por mes, ago-dic).
 * Por eso es un concepto PROPIO y no una parametrización de `gratificacion`
 * (la base es el jornal × N, no una fracción de sueldo).
 *
 * ✅ CONFIRMADO (R.M. 197-2025-TR): 40 + 40 jornales.
 * El N° de jornales y el jornal básico se resuelven vía `ParametrosLegales`.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_GRATI_CC = 'gratificacion_construccion_civil';

const MESES_DEVENGUE_FP = 7; // enero–julio
const MESES_DEVENGUE_NAVIDAD = 5; // agosto–diciembre

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaGratiConstruccion {
  mes: number;
  jornalBasicoDiario: number;
  /** Jornales por fiesta (✅ 40). */
  jornalesPorFiesta: number;
  /** Meses completos del devengue acumulados (1..7 FP, 1..5 Navidad). */
  mesesDevengados: number;
  /** Días de obra acumulados; para la guarda de días mínimos. */
  diasObra: number;
  /** ⚠️ NO CONFIRMADO: días mínimos de obra para tener derecho. */
  diasMinimosGrati: number;
}

export function calcularGratiConstruccion(
  entrada: EntradaGratiConstruccion,
): ResultadoConcepto {
  const esFiestasPatrias = entrada.mes === 7;
  const esNavidad = entrada.mes === 12;
  if (!esFiestasPatrias && !esNavidad) return { conceptos: [] };
  if (entrada.diasObra < entrada.diasMinimosGrati) return { conceptos: [] };

  const mesesDevengue = esFiestasPatrias
    ? MESES_DEVENGUE_FP
    : MESES_DEVENGUE_NAVIDAD;
  const proporcion =
    Math.min(entrada.mesesDevengados, mesesDevengue) / mesesDevengue;

  const montoCompleto = entrada.jornalBasicoDiario * entrada.jornalesPorFiesta;
  const monto = redondear2(montoCompleto * proporcion);
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_GRATI_CC,
    descripcion: esFiestasPatrias
      ? 'Gratificación Fiestas Patrias (construcción civil)'
      : 'Gratificación Navidad (construcción civil)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
