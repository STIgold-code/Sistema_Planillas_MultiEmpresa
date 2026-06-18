/**
 * Concepto régimen-variable: aporte de salud del empleador en MICROEMPRESA.
 *
 * A diferencia del resto de régimenes (EsSalud 9% sobre la afecta), la
 * microempresa REMYPE accede al régimen semicontributivo del SIS: el empleador
 * aporta un MONTO FIJO mensual por trabajador, NO un porcentaje de la
 * remuneración. Por eso es un concepto propio y no una parametrización del
 * `salud-empleador` (la regla es genuinamente distinta: fijo vs. %).
 *
 * El monto SIS se resuelve vía `ParametrosLegales.sisMicroempresa` en la
 * estrategia. Es un APORTE del empleador (no descuenta al trabajador).
 *
 * [ASUNCIÓN A VALIDAR: monto SIS microempresa y opción de afiliación a EsSalud].
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_SIS = 'sis_microempresa';

export interface EntradaSaludMicroempresa {
  remuneracionAfecta: number;
  /** Monto fijo SIS semicontributivo del empleador (de ParametrosLegales). */
  sis: number;
}

export function calcularSaludMicroempresa(
  entrada: EntradaSaludMicroempresa,
): ResultadoConcepto {
  if (entrada.remuneracionAfecta <= 0 || entrada.sis <= 0) {
    return { conceptos: [] };
  }

  const concepto: ConceptoBoleta = {
    clave: CLAVE_SIS,
    descripcion: 'Aporte SIS semicontributivo (empleador)',
    tipo: 'aporte',
    monto: entrada.sis,
  };
  return { conceptos: [concepto] };
}
