/**
 * Factory: mapea `RegimenLaboral` → estrategia `CalculadoraRegimen`.
 *
 * Punto único de extensión (OCP): agregar un nuevo régimen es registrar UNA
 * línea en `REGISTRO`. El orquestador nunca cambia. Para PR3 solo GENERAL está
 * registrado; los demás régimenes (REMYPE/Micro/Hogar/Agrario/Construcción) se
 * suman en PR4+.
 *
 * Régimen no registrado → `RegimenNoSoportadoError` (falla rápido, sin boleta).
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { RegimenGeneral } from './regimen-general';
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
};

export function crearCalculadoraRegimen(
  regimen: RegimenLaboral,
): CalculadoraRegimen {
  const fabrica = REGISTRO[regimen];
  if (!fabrica) throw new RegimenNoSoportadoError(regimen);
  return fabrica();
}
