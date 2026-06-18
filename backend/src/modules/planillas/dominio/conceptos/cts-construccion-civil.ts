/**
 * Concepto régimen-variable: CTS de CONSTRUCCIÓN CIVIL.
 *
 * Regla genuinamente distinta del régimen general: la CTS es el 15% del TOTAL
 * de jornales básicos percibidos en el período (incluye el 3% de participación).
 * No usa la fórmula (rc/12)·meses del concepto `cts` general; por eso es propio.
 *
 * ✅ CONFIRMADO (R.M. 197-2025-TR): CTS = 15% de jornales básicos.
 * El porcentaje se resuelve vía `ParametrosLegales` (cero hardcodeo en dominio).
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_CTS_CC = 'cts_construccion_civil';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaCtsConstruccion {
  /** Total de jornales básicos percibidos en el período (jornal × días). */
  totalJornalesBasicos: number;
  /** Porcentaje de CTS (✅ 0.15). */
  ctsPorcentaje: number;
}

export function calcularCtsConstruccion(
  entrada: EntradaCtsConstruccion,
): ResultadoConcepto {
  if (entrada.totalJornalesBasicos <= 0) return { conceptos: [] };

  const monto = redondear2(
    entrada.totalJornalesBasicos * entrada.ctsPorcentaje,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_CTS_CC,
    descripcion: 'CTS construcción civil (15% de jornales básicos)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
