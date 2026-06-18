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
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularSaludMicroempresa } from '../conceptos/salud-microempresa';

const SIN_CONCEPTOS: ResultadoConcepto = { conceptos: [] };

export class RegimenMicroempresa implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.MICROEMPRESA;
  readonly certificadoProduccion = true;

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
