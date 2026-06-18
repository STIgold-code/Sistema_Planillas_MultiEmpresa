/**
 * Concepto régimen-variable: gratificación y CTS AGRARIO en el sistema SEPARADO.
 *
 * Ley 31110 — sistema (a): grati y CTS se pagan por separado (no prorrateados en
 * el jornal). Se expresan como proporción mensual de la Remuneración Básica:
 *   - Gratificación = 16.66% de la RB.
 *   - CTS           = 9.72% de la RB.
 *
 * ✅ CONFIRMADO: factores 16.66% / 9.72% de la RB. Resueltos vía
 * `ParametrosLegales` (cero hardcodeo). La estrategia decide invocarlos cuando
 * NO se usa prorrateo.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_GRATI_AGRARIO = 'gratificacion_agraria';
export const CLAVE_CTS_AGRARIO = 'cts_agraria';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaBeneficiosAgrario {
  remuneracionBasica: number;
  gratiPctRb: number;
  ctsPctRb: number;
}

export function calcularGratiAgraria(
  entrada: EntradaBeneficiosAgrario,
): ResultadoConcepto {
  if (entrada.remuneracionBasica <= 0) return { conceptos: [] };
  const monto = redondear2(entrada.remuneracionBasica * entrada.gratiPctRb);
  if (monto <= 0) return { conceptos: [] };
  const concepto: ConceptoBoleta = {
    clave: CLAVE_GRATI_AGRARIO,
    descripcion: 'Gratificación agraria (16.66% RB)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}

export function calcularCtsAgraria(
  entrada: EntradaBeneficiosAgrario,
): ResultadoConcepto {
  if (entrada.remuneracionBasica <= 0) return { conceptos: [] };
  const monto = redondear2(entrada.remuneracionBasica * entrada.ctsPctRb);
  if (monto <= 0) return { conceptos: [] };
  const concepto: ConceptoBoleta = {
    clave: CLAVE_CTS_AGRARIO,
    descripcion: 'CTS agraria (9.72% RB)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
