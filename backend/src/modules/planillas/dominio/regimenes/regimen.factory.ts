/**
 * Factory: mapea `RegimenLaboral` → estrategia `CalculadoraRegimen`.
 *
 * Punto único de extensión (OCP): agregar un nuevo régimen es registrar UNA
 * línea en `REGISTRO`. El orquestador nunca cambia. Registrados: GENERAL (PR3),
 * PEQUENA_EMPRESA, MICROEMPRESA y HOGAR (PR4). Los régimenes con verificación
 * legal pendiente (AGRARIO, CONSTRUCCION_CIVIL) se suman en PR5.
 *
 * Régimen no registrado → `RegimenNoSoportadoError` (falla rápido, sin boleta).
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { RegimenGeneral } from './regimen-general';
import { RegimenPequenaEmpresa } from './regimen-pequena-empresa';
import { RegimenMicroempresa } from './regimen-microempresa';
import { RegimenHogar } from './regimen-hogar';
import { RegimenAgrario } from './regimen-agrario';
import { RegimenConstruccionCivil } from './regimen-construccion-civil';
import { RegimenLaboral } from '../tipos';

/** Raised when no strategy is registered for a labor régimen. */
export class RegimenNoSoportadoError extends Error {
  constructor(public readonly regimen: RegimenLaboral) {
    super(`No hay calculadora registrada para el régimen "${regimen}"`);
    this.name = 'RegimenNoSoportadoError';
  }
}

type FabricaRegimen = () => CalculadoraRegimen;

/** Registro enum → fábrica de estrategia. Agregar un régimen = 1 línea. */
const REGISTRO: Partial<Record<RegimenLaboral, FabricaRegimen>> = {
  [RegimenLaboral.GENERAL]: () => new RegimenGeneral(),
  [RegimenLaboral.PEQUENA_EMPRESA]: () => new RegimenPequenaEmpresa(),
  [RegimenLaboral.MICROEMPRESA]: () => new RegimenMicroempresa(),
  [RegimenLaboral.HOGAR]: () => new RegimenHogar(),
  [RegimenLaboral.AGRARIO]: () => new RegimenAgrario(),
  [RegimenLaboral.CONSTRUCCION_CIVIL]: () => new RegimenConstruccionCivil(),
};

export function crearCalculadoraRegimen(
  regimen: RegimenLaboral,
): CalculadoraRegimen {
  const fabrica = REGISTRO[regimen];
  if (!fabrica) throw new RegimenNoSoportadoError(regimen);
  return fabrica();
}
