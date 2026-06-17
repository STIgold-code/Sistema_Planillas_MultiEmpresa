/**
 * Concepto régimen-variable: asignación familiar (10% de la RMV).
 *
 * Monto plano único cuando el trabajador tiene ≥1 hijo calificado, sin importar
 * el número de hijos, para los régimenes que la otorgan. El monto (10% RMV) se
 * resuelve vía `ParametrosLegales` en la estrategia y se inyecta aquí.
 *
 * Régimen-variable: micro/hogar pueden no otorgarla (la estrategia decide no
 * invocarla). Aquí solo se modela la regla "tiene hijos → monto plano".
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
