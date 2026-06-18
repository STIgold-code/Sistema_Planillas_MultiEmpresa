/**
 * RegimenHogar — estrategia de las trabajadoras del hogar (Ley 31047).
 *
 * Implementa `CalculadoraRegimen` reusando los conceptos régimen-variables con
 * los factores del régimen del hogar (equiparado al general por la Ley 31047):
 *   - Gratificación: 1 sueldo completo por semestre → 2 sueldos/año (jul+dic).
 *     [ASUNCIÓN A VALIDAR: gratificación entera vs. media para hogar].
 *   - CTS: factor 1 (½ sueldo por semestre → 1 sueldo/año, igual a general).
 *     [ASUNCIÓN A VALIDAR: periodicidad de depósito hogar].
 *   - Vacaciones: derecho 30 días/año; el concepto valoriza los días gozados.
 *   - Asignación familiar: 10% RMV si tiene hijos.
 *     [ASUNCIÓN A VALIDAR: asignación familiar en hogar].
 *   - Salud: EsSalud 9% con piso RMV.
 *     [ASUNCIÓN A VALIDAR: base mínima EsSalud hogar].
 *
 * Puro: no conoce Prisma ni Nest. La bonificación extraordinaria (Ley 30334) la
 * deriva el orquestador de la gratificación que esta estrategia produce.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { calcularGratificacion } from '../conceptos/gratificacion';
import { calcularCts } from '../conceptos/cts';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularAsignacionFamiliar } from '../conceptos/asignacion-familiar';
import { calcularSaludEmpleador } from '../conceptos/salud-empleador';

/** Factor hogar: beneficio completo por semestre, equiparado al general. */
const FRACCION_HOGAR = 1;

export class RegimenHogar implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.HOGAR;

  gratificacion(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularGratificacion(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: ctx.remuneracionComputable,
        mesesTrabajados: ctx.devengados.mesesGratificacion,
        resumenTareo: ctx.resumenTareo,
      },
      FRACCION_HOGAR,
    );
  }

  cts(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularCts(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: ctx.remuneracionComputable,
        sextoGratificacion: ctx.devengados.sextoGratificacion,
        mesesCts: ctx.devengados.mesesCts,
        diasCts: ctx.devengados.diasCts,
      },
      FRACCION_HOGAR,
    );
  }

  vacaciones(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularVacaciones(
      ctx.remuneracionMensual,
      ctx.devengados.diasVacaciones,
    );
  }

  asignacionFamiliar(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return calcularAsignacionFamiliar(
      ctx.tieneHijos,
      params.asignacionFamiliar(ctx.periodo.fecha),
    );
  }

  saludEmpleador(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return calcularSaludEmpleador({
      remuneracionAfecta: ctx.remuneracionAfecta,
      rmv: params.rmv(ctx.periodo.fecha),
      essaludTasa: params.essaludTasa(ctx.periodo.fecha),
      essaludMinimo: params.essaludMinimo(ctx.periodo.fecha),
    });
  }
}
