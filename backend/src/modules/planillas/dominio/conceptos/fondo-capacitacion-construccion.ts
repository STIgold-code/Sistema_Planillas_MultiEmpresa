/**
 * Concepto régimen-variable: aporte al Fondo de Capacitación (construcción civil).
 *
 * Aporte del EMPLEADOR del 0.45% del jornal básico diario pagado (vigente desde
 * 01-ene-2026). Es un aporte, no descuenta al trabajador.
 *
 * ✅ CONFIRMADO (R.M. 197-2025-TR): 0.45% del jornal básico.
 * El % se resuelve vía `ParametrosLegales`.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_FONDO_CAPACITACION = 'fondo_capacitacion_construccion';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaFondoCapacitacion {
  /** Total de jornales básicos pagados en el período (jornal × días). */
  totalJornalesBasicos: number;
  fondoCapacitacionPorcentaje: number;
}

export function calcularFondoCapacitacion(
  entrada: EntradaFondoCapacitacion,
): ResultadoConcepto {
  if (entrada.totalJornalesBasicos <= 0) return { conceptos: [] };

  const monto = redondear2(
    entrada.totalJornalesBasicos * entrada.fondoCapacitacionPorcentaje,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_FONDO_CAPACITACION,
    descripcion: 'Aporte Fondo de Capacitación (empleador)',
    tipo: 'aporte',
    monto,
  };
  return { conceptos: [concepto] };
}
