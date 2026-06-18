/**
 * Concepto régimen-variable: prorrateo de beneficios en el jornal AGRARIO.
 *
 * La Ley 31110 permite DOS sistemas de pago: (a) separado (grati/CTS se pagan
 * aparte, igual que el general) o (b) prorrateado dentro de la remuneración
 * diaria. Este concepto modela el sistema (b):
 *
 *   Remuneración Diaria = (RB + 16.66%·RB + 9.72%·RB) / 30
 *
 * Donde 16.66% es la proporción mensual de gratificación y 9.72% la de CTS.
 *
 * ✅ CONFIRMADO: fórmula de prorrateo y factores (16.66% grati, 9.72% CTS).
 * Los factores se resuelven vía `ParametrosLegales` (cero hardcodeo).
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`. La estrategia decide si
 * usa este concepto (prorrateo) o los conceptos separados.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_PRORRATEO_AGRARIO = 'remuneracion_diaria_agraria';

const DIAS_MES = 30;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaProrrateoAgrario {
  remuneracionBasica: number;
  /** Proporción mensual de gratificación (✅ 0.1666). */
  gratiPctRb: number;
  /** Proporción mensual de CTS (✅ 0.0972). */
  ctsPctRb: number;
  /** Días efectivamente laborados en el período. */
  diasTrabajados: number;
}

/** Devuelve la remuneración diaria prorrateada (un valor, sin redondeo). */
export function remuneracionDiariaProrrateada(
  entrada: EntradaProrrateoAgrario,
): number {
  const rb = entrada.remuneracionBasica;
  const total = rb + rb * entrada.gratiPctRb + rb * entrada.ctsPctRb;
  return total / DIAS_MES;
}

export function calcularProrrateoAgrario(
  entrada: EntradaProrrateoAgrario,
): ResultadoConcepto {
  if (entrada.remuneracionBasica <= 0 || entrada.diasTrabajados <= 0) {
    return { conceptos: [] };
  }

  const diaria = remuneracionDiariaProrrateada(entrada);
  const monto = redondear2(diaria * entrada.diasTrabajados);
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_PRORRATEO_AGRARIO,
    descripcion: 'Remuneración diaria agraria (grati+CTS prorrateados)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
