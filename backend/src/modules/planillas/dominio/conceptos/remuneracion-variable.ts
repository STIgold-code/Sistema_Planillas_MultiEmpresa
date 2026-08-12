/**
 * Remuneraciones de naturaleza VARIABLE o IMPRECISA (horas extras, comisiones,
 * bonificaciones) y su incorporación a la remuneración computable de la
 * gratificación.
 *
 * BASE LEGAL — D.S. 005-2002-TR, Remuneración regular (concordante con el
 * art. 16 del D.S. 001-97-TR para la CTS):
 *
 *   «Se considera remuneración regular aquélla percibida habitualmente por el
 *   trabajador, aun cuando sus montos puedan variar en razón de incrementos u
 *   otros motivos. Tratándose de remuneraciones de naturaleza variable o
 *   imprecisa, se considera cumplido el requisito de regularidad si el
 *   trabajador las ha percibido, cuando menos, en alguna oportunidad en TRES
 *   meses durante el semestre correspondiente. Para su incorporación a la
 *   gratificación se suman los montos percibidos y el resultado se divide entre
 *   SEIS.»
 *
 * Dos reglas, ninguna negociable:
 *  1. UMBRAL de regularidad: menos de tres meses de percepción en el semestre →
 *     el concepto NO es regular y no integra la computable (aporta 0).
 *  2. DIVISOR fijo SEIS, nunca "los meses con datos": el promedio se toma sobre
 *     el semestre completo aunque el concepto se haya percibido en menos meses.
 *
 * Puro: sin Prisma, sin fechas. El borde de aplicación arma la suma y el conteo
 * de meses a partir de las planillas ya calculadas del semestre.
 */

/** Meses mínimos de percepción en el semestre para que el concepto sea REGULAR. */
export const MESES_MINIMOS_REGULARIDAD = 3;

/** Divisor legal del promedio: la suma del semestre se divide siempre entre 6. */
export const DIVISOR_PROMEDIO_SEMESTRE = 6;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

/** Lo percibido por UN concepto variable a lo largo del semestre. */
export interface RemuneracionVariableSemestre {
  /** Suma de los montos percibidos por el concepto en el semestre. */
  totalSemestre: number;
  /** Meses del semestre en los que se percibió el concepto (monto > 0). */
  mesesPercibidos: number;
}

/**
 * Los tres conceptos variables que el motor sigue por trabajador. Se tratan con
 * la MISMA regla: la ley no distingue entre horas extras, comisiones y
 * bonificaciones, sino entre remuneración regular e irregular.
 */
export interface VariablesSemestreGratificacion {
  horasExtras: RemuneracionVariableSemestre;
  comisiones: RemuneracionVariableSemestre;
  bonificaciones: RemuneracionVariableSemestre;
}

/**
 * Promedio computable de UN concepto variable. Ausente o por debajo del umbral
 * de regularidad → 0: sin evidencia de habitualidad el concepto no integra la
 * gratificación.
 */
export function promedioComputableVariable(
  variable?: RemuneracionVariableSemestre,
): number {
  if (!variable) return 0;
  if (variable.mesesPercibidos < MESES_MINIMOS_REGULARIDAD) return 0;
  if (variable.totalSemestre <= 0) return 0;
  return redondear2(variable.totalSemestre / DIVISOR_PROMEDIO_SEMESTRE);
}

/**
 * Promedio computable TOTAL que las remuneraciones variables aportan a la
 * gratificación. Cada concepto pasa el umbral por separado: percibir horas
 * extras cuatro meses no vuelve regular a una bonificación de un solo mes.
 */
export function promedioComputableVariables(
  variables?: VariablesSemestreGratificacion,
): number {
  if (!variables) return 0;
  return redondear2(
    promedioComputableVariable(variables.horasExtras) +
      promedioComputableVariable(variables.comisiones) +
      promedioComputableVariable(variables.bonificaciones),
  );
}
