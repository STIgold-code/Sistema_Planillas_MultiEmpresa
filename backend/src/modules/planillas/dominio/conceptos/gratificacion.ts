/**
 * Concepto régimen-variable: gratificación (Ley 27735).
 *
 * Pure refactor del núcleo monetario de `calculos/gratificaciones.ts`. El
 * cálculo de "meses trabajados en el semestre" (dependiente de fechas Prisma)
 * se resuelve fuera del dominio y se inyecta como `mesesTrabajados`, de modo que
 * este concepto permanece puro.
 *
 * GENERAL (D.L. 728): 1 sueldo completo por semestre → 2 sueldos/año (jul+dic).
 * Régimenes con grati reducida (REMYPE pequeña) inyectan un factor distinto en
 * su propia estrategia, no aquí.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`. Cada estrategia decide
 * si lo invoca y con qué proporción.
 */
import { ConceptoBoleta, ResultadoConcepto, ResumenTareo } from '../tipos';

export const CLAVE_GRATIFICACION = 'gratificacion';

const MESES_SEMESTRE = 6;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaGratificacion {
  mes: number;
  remuneracionComputable: number;
  mesesTrabajados: number;
  resumenTareo: ResumenTareo;
}

/** Fracción de sueldo que el régimen otorga por semestre completo (GENERAL = 1). */
export function calcularGratificacion(
  entrada: EntradaGratificacion,
  fraccionSemestre = 1,
): ResultadoConcepto {
  const esGratificacion = entrada.mes === 7 || entrada.mes === 12;
  if (!esGratificacion) return { conceptos: [] };
  if (entrada.resumenTareo.diasTrabajados <= 0) return { conceptos: [] };

  const proporcion = entrada.mesesTrabajados / MESES_SEMESTRE;
  const monto = redondear2(
    entrada.remuneracionComputable * proporcion * fraccionSemestre,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_GRATIFICACION,
    descripcion: 'Gratificación',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
