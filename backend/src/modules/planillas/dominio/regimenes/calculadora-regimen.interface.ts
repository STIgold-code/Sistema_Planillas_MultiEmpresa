/**
 * CalculadoraRegimen — the Strategy contract for régimen-varying benefits.
 *
 * Each labor régimen (D.L. 728, REMYPE, Hogar, Agrario, Construcción Civil)
 * implements this interface. The orchestrator (`calcular-boleta`, PR3) selects
 * a strategy via the factory and composes its results with the shared,
 * régimen-agnostic concepts — WITHOUT any `if (regimen === ...)` branch (OCP).
 *
 * SCOPE NOTE (PR2): this file defines the CONTRACT only. The 6 concrete
 * strategies, the factory and the orchestrator are implemented in PR3+.
 *
 * Concepts that DO vary by régimen and live behind this interface:
 *   gratificación, CTS, vacaciones, asignación familiar, salud del empleador
 *   (EsSalud 9% | SIS micro). Bonificación extraordinaria Ley 30334 deriva de
 *   la gratificación.
 */
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';

export interface CalculadoraRegimen {
  readonly regimen: RegimenLaboral;

  gratificacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto;
  cts(ctx: ContextoCalculo, params: ParametrosLegales): ResultadoConcepto;
  vacaciones(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto;
  asignacionFamiliar(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto;
  /** EsSalud 9% para la mayoría; SIS fijo en microempresa. */
  saludEmpleador(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto;
}
