/**
 * RegimenMicroempresa — estrategia del régimen REMYPE microempresa.
 *
 * Implementa `CalculadoraRegimen` con los mínimos de la microempresa:
 *   - Gratificación: NO aplica (lista vacía).
 *   - CTS: NO aplica (lista vacía).
 *   - Vacaciones: derecho 15 días/año; el concepto valoriza los días gozados.
 *   - Asignación familiar: NO aplica.
 *     [ASUNCIÓN A VALIDAR: asignación familiar en microempresa].
 *   - Salud: SIS semicontributivo (monto fijo del empleador), NO EsSalud 9%.
 *     [ASUNCIÓN A VALIDAR: monto SIS y opción de afiliación a EsSalud].
 *
 * Puro: no conoce Prisma ni Nest. Reusa `vacaciones` y `salud-microempresa`;
 * no compone grati/CTS/AF porque la microempresa no los otorga. La bonificación
 * extraordinaria (Ley 30334) no se genera al no haber gratificación.
 *
 * NO CERTIFICADO PARA PRODUCCIÓN (`certificadoProduccion = false`), por DOS
 * motivos independientes:
 *
 *   1. NO HAY DÓNDE GUARDAR EL SIS. La estrategia emite `sis_microempresa`, una
 *      clave que no existe en `schema.prisma`, ni en el DTO de PlanillaDetalle,
 *      ni en la boleta, ni en el frontend. El mapper de aplicación no la sabe
 *      traducir, de modo que la planilla se persistía con
 *      `essalud_empleador = 0` y CERO rastro del aporte del empleador: una
 *      boleta legalmente incompleta que nadie podía detectar. Modelar la
 *      columna es una migración de schema más su propagación al DTO, al PDF y
 *      al frontend; hasta que eso exista, bloquear es la única alternativa
 *      honesta a emitir un aporte silenciosamente en cero.
 *   2. LAS REGLAS NO ESTÁN CONFIRMADAS. Las dos [ASUNCIÓN A VALIDAR] de abajo
 *      (asignación familiar en microempresa; monto del SIS y opción de
 *      afiliación a EsSalud) nunca las revisó un contador, exactamente igual
 *      que en AGRARIO y CONSTRUCCION_CIVIL.
 *
 * Cómo se LEVANTA: modelar la columna del SIS (schema + DTO + boleta + front),
 * confirmar las dos asunciones con un contador y cambiar `CERTIFICADO_PRODUCCION`
 * a `true`. El motor SÍ sigue calculando microempresa para pruebas: lo que se
 * bloquea es la emisión de nómina REAL, en el borde de aplicación.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularSaludMicroempresa } from '../conceptos/salud-microempresa';

const SIN_CONCEPTOS: ResultadoConcepto = { conceptos: [] };

/** Ver el encabezado: sin columna para el SIS y con asunciones sin validar. */
const CERTIFICADO_PRODUCCION = false;

export class RegimenMicroempresa implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.MICROEMPRESA;
  readonly certificadoProduccion = CERTIFICADO_PRODUCCION;

  conceptosRegimen(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return {
      conceptos: [
        ...this.gratificacion().conceptos,
        ...this.cts().conceptos,
        ...this.vacaciones(ctx).conceptos,
        ...this.asignacionFamiliar().conceptos,
        ...this.saludEmpleador(ctx, params).conceptos,
      ],
    };
  }

  aportaHaberBase(): boolean {
    return false;
  }

  clavesGratificacion(): string[] {
    // La microempresa no paga gratificación → no genera bonificación 30334.
    return [];
  }

  gratificacion(): ResultadoConcepto {
    return SIN_CONCEPTOS;
  }

  cts(): ResultadoConcepto {
    return SIN_CONCEPTOS;
  }

  vacaciones(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularVacaciones(
      ctx.remuneracionMensual,
      ctx.devengados.diasVacaciones,
    );
  }

  asignacionFamiliar(): ResultadoConcepto {
    // [ASUNCIÓN A VALIDAR] La microempresa REMYPE no otorga asignación familiar.
    return SIN_CONCEPTOS;
  }

  saludEmpleador(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return calcularSaludMicroempresa({
      remuneracionAfecta: ctx.remuneracionAfecta,
      sis: params.sisMicroempresa(ctx.periodo.fecha),
    });
  }
}
