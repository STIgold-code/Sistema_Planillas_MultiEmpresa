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
 *   (EsSalud 9% | SIS micro), MÁS los conceptos PROPIOS de cada régimen (p. ej.
 *   BUC, CONAFOVICER y fondo de capacitación en construcción civil; remuneración
 *   diaria prorrateada en el agrario). Bonificación extraordinaria Ley 30334
 *   deriva de la gratificación.
 *
 * CONTRATO DE COMPOSICIÓN (W1): el orquestador NO invoca un conjunto fijo de
 * métodos por concepto, porque eso dejaba fuera los conceptos propios de cada
 * régimen (BUC, CONAFOVICER, fondo de capacitación, remuneración diaria). En su
 * lugar, cada estrategia ENSAMBLA su boleta COMPLETA en `conceptosRegimen()` y el
 * orquestador la COLECTA de forma genérica (cero `if (regimen === ...)`, OCP).
 * Las funciones por concepto siguen siendo públicas en cada estrategia para que
 * los specs las prueben de forma aislada; pero el punto de composición único es
 * `conceptosRegimen()`.
 */
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';

export interface CalculadoraRegimen {
  readonly regimen: RegimenLaboral;

  /**
   * Guarda de certificación: indica si la estrategia está CERTIFICADA para
   * correr planilla real. Los régimenes cuyas reglas legales aún no fueron
   * confirmadas por un contador (AGRARIO, CONSTRUCCION_CIVIL en PR5) devuelven
   * `false`, de modo que un consumidor no pueda emitir nómina real sin que sea
   * evidente que falta certificación. Por defecto (régimenes ya verificados) es
   * `true`.
   *
   * Cómo se LEVANTA el flag: cuando el contador confirme los puntos
   * ⚠️ NO CONFIRMADOS y se quiten los `it.skip(...)` de los specs, se cambia el
   * valor de la constante `CERTIFICADO_PRODUCCION` de la estrategia a `true`.
   */
  readonly certificadoProduccion: boolean;

  /**
   * Ensambla la lista COMPLETA de conceptos régimen-específicos de la boleta:
   * los conceptos régimen-variables comunes (gratificación, CTS, vacaciones,
   * asignación familiar, salud del empleador) MÁS los conceptos PROPIOS del
   * régimen (BUC, CONAFOVICER, fondo de capacitación, remuneración diaria, etc.).
   *
   * NO incluye los conceptos régimen-agnósticos (haber, horas extras, jornada
   * nocturna, pensión, renta 5ta) ni la bonificación extraordinaria Ley 30334:
   * esos los compone el orquestador. La bonificación 30334 se deriva de la
   * gratificación que esta lista contenga (clave `CLAVE_GRATIFICACION` o la grati
   * propia del régimen, según corresponda).
   */
  conceptosRegimen(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto;

  /**
   * Señala si la estrategia aporta su PROPIA remuneración base dentro de
   * `conceptosRegimen()` (p. ej. el agrario en modo PRORRATEO emite
   * `remuneracion_diaria_agraria`, que ya incluye el sueldo base prorrateado).
   *
   * Cuando devuelve `true`, el orquestador NO debe emitir además el
   * `haber_mensual` genérico (= sueldoBase/30 × días), porque eso contaría el
   * sueldo base dos veces (C-3). Por defecto `false`: la mayoría de los régimenes
   * NO aportan su base y dependen del haber genérico del orquestador.
   */
  aportaHaberBase(ctx: ContextoCalculo): boolean;

  /**
   * Claves de gratificación afectas a la bonificación extraordinaria Ley 30334
   * que esta estrategia emite en `conceptosRegimen()`. El orquestador suma los
   * montos de TODAS estas claves para derivar la bonificación 30334 (C-4).
   *
   * GENERAL/REMYPE/Hogar declaran `[CLAVE_GRATIFICACION]`; construcción civil su
   * grati propia; agrario (sistema separado) la suya; microempresa `[]` (no paga
   * gratificación, por lo que no genera bonificación 30334).
   */
  clavesGratificacion(): string[];

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
