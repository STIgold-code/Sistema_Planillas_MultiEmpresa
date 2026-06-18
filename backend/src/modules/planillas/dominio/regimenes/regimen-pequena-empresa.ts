/**
 * RegimenPequenaEmpresa — estrategia del régimen REMYPE pequeña empresa.
 *
 * Implementa `CalculadoraRegimen` reusando los MISMOS conceptos régimen-variables
 * que GENERAL, parametrizados con los factores reducidos de REMYPE pequeña:
 *   - Gratificación: 1/2 sueldo por semestre → 1 sueldo/año (½ jul + ½ dic).
 *   - CTS: 1/2 depósito (½ sueldo/año).
 *   - Vacaciones: derecho 15 días/año; el concepto valoriza los días gozados.
 *   - Asignación familiar: 10% RMV si tiene hijos.
 *     [ASUNCIÓN A VALIDAR: REMYPE pequeña otorga asignación familiar].
 *   - Salud: EsSalud 9% con piso RMV (igual a GENERAL).
 *
 * Puro: no conoce Prisma ni Nest. La bonificación extraordinaria (Ley 30334) la
 * deriva el orquestador de la gratificación reducida que esta estrategia produce.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { calcularGratificacion } from '../conceptos/gratificacion';
import { calcularCts } from '../conceptos/cts';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularAsignacionFamiliar } from '../conceptos/asignacion-familiar';
import { calcularSaludEmpleador } from '../conceptos/salud-empleador';

/** Factor REMYPE pequeña: medio beneficio respecto al régimen general. */
const FRACCION_PEQUENA = 0.5;

export class RegimenPequenaEmpresa implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.PEQUENA_EMPRESA;
  readonly certificadoProduccion = true;

  gratificacion(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularGratificacion(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: ctx.remuneracionComputable,
        mesesTrabajados: ctx.devengados.mesesGratificacion,
        resumenTareo: ctx.resumenTareo,
      },
      FRACCION_PEQUENA,
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
      FRACCION_PEQUENA,
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
