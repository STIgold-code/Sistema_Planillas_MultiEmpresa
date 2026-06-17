/**
 * RegimenGeneral — estrategia del régimen laboral común (D.L. 728).
 *
 * Implementa `CalculadoraRegimen` componiendo los conceptos régimen-variables
 * con los factores del régimen general:
 *   - Gratificación: 1 sueldo completo por semestre (factor 1).
 *   - CTS: 1 sueldo por semestre, incluye 1/6 de gratificación (factor 1).
 *   - Vacaciones: valoriza los días gozados del período (derecho 30 días/año).
 *   - Asignación familiar: 10% RMV si tiene hijos.
 *   - Salud: EsSalud 9% con piso RMV.
 *
 * Puro: no conoce Prisma ni Nest; recibe `ContextoCalculo` y `ParametrosLegales`.
 * El orquestador deriva la bonificación extraordinaria (Ley 30334) a partir de
 * la gratificación que esta estrategia produce, sin que la estrategia la exponga.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ContextoCalculo, RegimenLaboral, ResultadoConcepto } from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { calcularGratificacion } from '../conceptos/gratificacion';
import { calcularCts } from '../conceptos/cts';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularAsignacionFamiliar } from '../conceptos/asignacion-familiar';
import { calcularSaludEmpleador } from '../conceptos/salud-empleador';

export class RegimenGeneral implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.GENERAL;

  gratificacion(ctx: ContextoCalculo): ResultadoConcepto {
    return calcularGratificacion(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: ctx.remuneracionComputable,
        mesesTrabajados: ctx.devengados.mesesGratificacion,
        resumenTareo: ctx.resumenTareo,
      },
      1,
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
      1,
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
