/**
 * Test stub: provides the `agrario` and `construccionCivil` resolvers so specs
 * that build a literal `ParametrosLegales` stay compiling without repeating the
 * full agrario/CC tables. Régimen-specific specs override these with their own
 * confirmed values.
 */
import {
  ParametrosAgrario,
  ParametrosConstruccionCivil,
} from './parametros-legales';

export const AGRARIO_STUB: ParametrosAgrario = {
  remMinimaDiaria: 47.61,
  rmvReferencia: 1130,
  essaludTasaGrande: 0.09,
  essaludTasaPequena: 0.06,
  gratiPctRb: 0.1666,
  ctsPctRb: 0.0972,
  diasVacaciones: 30,
};

export const CC_STUB: ParametrosConstruccionCivil = {
  jornalBasicoDiario: 89.3,
  bucPorcentaje: 0.32,
  gratiJornales: 40,
  ctsPorcentaje: 0.15,
  conafovicerPorcentaje: 0.02,
  fondoCapacitacionPorcentaje: 0.0045,
  movilidadDiaria: 0,
  baeMonto: 0,
  diasMinimosGrati: 0,
};

export const stubParametrosRegimenes = {
  agrario: (): ParametrosAgrario => AGRARIO_STUB,
  construccionCivil: (): ParametrosConstruccionCivil => CC_STUB,
};
