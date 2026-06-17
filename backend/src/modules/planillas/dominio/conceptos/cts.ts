/**
 * Concepto régimen-variable: CTS (D.S. 001-97-TR).
 *
 * Pure refactor del núcleo monetario de `calculos/cts.ts`. La determinación de
 * meses/días del semestre (dependiente de fechas Prisma) y el 1/6 de la última
 * gratificación se resuelven fuera del dominio y se inyectan, manteniendo el
 * concepto puro.
 *
 * Fórmula: (rc/12)·meses + (rc/360)·días, con rc = computable + 1/6 grati.
 * GENERAL deposita en mayo y noviembre. Régimenes con CTS reducida (REMYPE)
 * inyectan su propio factor en la estrategia.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_CTS = 'cts';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaCts {
  mes: number;
  remuneracionComputable: number;
  sextoGratificacion: number;
  mesesCts: number;
  diasCts: number;
}

/** Fracción de depósito que el régimen otorga (GENERAL = 1, REMYPE pequeña = 0.5). */
export function calcularCts(
  entrada: EntradaCts,
  fraccion = 1,
): ResultadoConcepto {
  const esCts = entrada.mes === 5 || entrada.mes === 11;
  if (!esCts) return { conceptos: [] };

  const rc = entrada.remuneracionComputable + entrada.sextoGratificacion;
  const monto = redondear2(
    ((rc / 12) * entrada.mesesCts + (rc / 360) * entrada.diasCts) * fraccion,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_CTS,
    descripcion: 'Compensación por Tiempo de Servicios',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
