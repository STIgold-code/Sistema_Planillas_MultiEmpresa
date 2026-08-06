/**
 * Concepto régimen-variable: asignación familiar (10% de la RMV).
 *
 * Monto plano único cuando el trabajador tiene ≥1 hijo calificado, sin importar
 * el número de hijos, para los régimenes que la otorgan. El monto (10% RMV) se
 * resuelve vía `ParametrosLegales` en la estrategia y se inyecta aquí.
 *
 * Régimen-variable: micro/hogar pueden no otorgarla (la estrategia decide no
 * invocarla). Aquí solo se modela la regla "tiene derecho → monto plano".
 *
 * El flag `tieneHijos` representa el DERECHO a cobrar la asignación familiar
 * (fuente: `empleado.asignacion_familiar`), no literalmente la tenencia de hijos.
 * El monto se paga cuando el trabajador tiene derecho, según ley (10% RMV ≈ S/113).
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_ASIGNACION_FAMILIAR = 'asignacion_familiar';

export function calcularAsignacionFamiliar(
  tieneHijos: boolean,
  montoAsignacionFamiliar: number,
): ResultadoConcepto {
  if (!tieneHijos || montoAsignacionFamiliar <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_ASIGNACION_FAMILIAR,
    descripcion: 'Asignación familiar',
    tipo: 'ingreso',
    monto: montoAsignacionFamiliar,
  };
  return { conceptos: [concepto] };
}

/**
 * Remuneración computable de BENEFICIOS (gratificación Ley 27735 y CTS
 * D.S. 001-97-TR) = remuneración básica MÁS la asignación familiar.
 *
 * La asignación familiar es remuneración REGULAR y permanente (Ley 25129), por
 * lo que integra la base de cálculo de ambos beneficios. Es el mismo criterio
 * que ya se aplica a la base de cotización (EsSalud, pensión y renta de 5ta).
 *
 * Recibe el RESULTADO del concepto (no el flag) para que cada estrategia decida
 * si otorga la asignación: los régimenes que no la emiten (microempresa) o los
 * que calculan sus beneficios sobre otra base legal (agrario, construcción
 * civil) no ven alterada su computable.
 */
export function computableConAsignacionFamiliar(
  remuneracionComputable: number,
  asignacionFamiliar: ResultadoConcepto,
): number {
  const monto = asignacionFamiliar.conceptos
    .filter((c) => c.clave === CLAVE_ASIGNACION_FAMILIAR)
    .reduce((acc, c) => acc + c.monto, 0);
  return Math.round((remuneracionComputable + monto) * 100) / 100;
}
