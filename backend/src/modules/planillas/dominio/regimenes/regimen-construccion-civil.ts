/**
 * RegimenConstruccionCivil — estrategia de construcción civil (R.M. 197-2025-TR).
 *
 * NO CERTIFICADO PARA PRODUCCIÓN (`certificadoProduccion = false`): quedan
 * puntos pendientes de verificación de un contador peruano:
 *   - Base de cálculo de CONAFOVICER (jornal básico vs remuneración total).
 *   - Monto BAE exacto y tasa SCTR.
 *   - Días mínimos de obra para derecho a gratificación.
 *   - Movilidad diaria.
 * El motor calcula, pero un consumidor NO debe emitir nómina real sin comprobar
 * `certificadoProduccion`.
 *
 * Cómo se levanta el flag: cuando el contador confirme esos 4 puntos (y se
 * quiten los `it.skip` de los specs), cambiar `CERTIFICADO_PRODUCCION` a `true`.
 *
 * Reglas (✅ CONFIRMADO salvo nota):
 *   - Jornal básico por categoría (operario 89.30 / oficial 69.75 / peón 62.80).
 *   - BUC: operario 32%, oficial/peón 30% del básico.
 *   - Gratificación: 40 jornales FP + 40 jornales Navidad.
 *   - CTS: 15% del total de jornales básicos.
 *   - CONAFOVICER: 2% descuento al trabajador (⚠️ base NO CONFIRMADA).
 *   - Fondo de Capacitación: 0.45% (aporte empleador).
 *   - EsSalud 9% (concepto compartido).
 *
 * Puro: no conoce Prisma ni Nest. Todos los factores vía `ParametrosLegales`.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import {
  CategoriaConstruccion,
  ContextoCalculo,
  RegimenLaboral,
  ResultadoConcepto,
} from '../tipos';
import {
  ParametrosLegales,
  ParametrosConstruccionCivil,
} from '../parametros/parametros-legales';
import { calcularGratiConstruccion } from '../conceptos/grati-construccion-civil';
import { calcularCtsConstruccion } from '../conceptos/cts-construccion-civil';
import { calcularConafovicer } from '../conceptos/conafovicer';
import { calcularBuc } from '../conceptos/bonificacion-unificada-construccion';
import { calcularFondoCapacitacion } from '../conceptos/fondo-capacitacion-construccion';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularAsignacionFamiliar } from '../conceptos/asignacion-familiar';
import { calcularSaludEmpleador } from '../conceptos/salud-empleador';

const SIN_CONCEPTOS: ResultadoConcepto = { conceptos: [] };

/**
 * Guarda de certificación. `false` hasta que el contador confirme los puntos
 * ⚠️ NO CONFIRMADOS (base CONAFOVICER, BAE/SCTR, días mínimos grati, movilidad).
 * Levantar a `true` SOLO tras esa confirmación y al retirar los `it.skip`.
 */
const CERTIFICADO_PRODUCCION = false;

export class RegimenConstruccionCivil implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.CONSTRUCCION_CIVIL;
  readonly certificadoProduccion = CERTIFICADO_PRODUCCION;

  /**
   * Boleta COMPLETA de construcción civil: conceptos régimen-variables comunes
   * MÁS los conceptos PROPIOS del régimen (BUC, CONAFOVICER, fondo de
   * capacitación). Resuelve W1: el orquestador ya no deja afuera estos conceptos.
   */
  conceptosRegimen(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return {
      conceptos: [
        ...this.gratificacion(ctx, params).conceptos,
        ...this.bonificacionUnificada(ctx, params).conceptos,
        ...this.cts(ctx, params).conceptos,
        ...this.vacaciones(ctx).conceptos,
        ...this.asignacionFamiliar(ctx, params).conceptos,
        ...this.conafovicer(ctx, params).conceptos,
        ...this.fondoCapacitacion(ctx, params).conceptos,
        ...this.saludEmpleador(ctx, params).conceptos,
      ],
    };
  }

  private tabla(ctx: ContextoCalculo, params: ParametrosLegales) {
    const categoria = ctx.categoriaConstruccion ?? CategoriaConstruccion.PEON;
    return params.construccionCivil(ctx.periodo.fecha, categoria);
  }

  private totalJornales(
    ctx: ContextoCalculo,
    cc: ParametrosConstruccionCivil,
  ): number {
    return cc.jornalBasicoDiario * ctx.resumenTareo.diasTrabajados;
  }

  gratificacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    const cc = this.tabla(ctx, params);
    return calcularGratiConstruccion({
      mes: ctx.periodo.mes,
      jornalBasicoDiario: cc.jornalBasicoDiario,
      jornalesPorFiesta: cc.gratiJornales,
      mesesDevengados:
        ctx.periodo.mes === 7 ? ctx.devengados.mesesGratificacion : 5,
      diasObra: ctx.resumenTareo.diasTrabajados,
      diasMinimosGrati: cc.diasMinimosGrati,
    });
  }

  cts(ctx: ContextoCalculo, params: ParametrosLegales): ResultadoConcepto {
    const cc = this.tabla(ctx, params);
    return calcularCtsConstruccion({
      totalJornalesBasicos: this.totalJornales(ctx, cc),
      ctsPorcentaje: cc.ctsPorcentaje,
    });
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

  /** BUC por categoría (✅ CONFIRMADO). Método propio del régimen. */
  bonificacionUnificada(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    const cc = this.tabla(ctx, params);
    return calcularBuc({
      jornalBasicoDiario: cc.jornalBasicoDiario,
      bucPorcentaje: cc.bucPorcentaje,
      diasTrabajados: ctx.resumenTareo.diasTrabajados,
    });
  }

  /**
   * CONAFOVICER (descuento al trabajador). ⚠️ Base NO CONFIRMADA: por defecto se
   * usa el total de jornales básicos; cambiar la base es un cambio de decisión
   * del contador, encapsulado aquí.
   */
  conafovicer(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    const cc = this.tabla(ctx, params);
    return calcularConafovicer({
      baseImponible: this.totalJornales(ctx, cc),
      conafovicerPorcentaje: cc.conafovicerPorcentaje,
    });
  }

  /** Aporte al Fondo de Capacitación (✅ CONFIRMADO). */
  fondoCapacitacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    const cc = this.tabla(ctx, params);
    if (ctx.resumenTareo.diasTrabajados <= 0) return SIN_CONCEPTOS;
    return calcularFondoCapacitacion({
      totalJornalesBasicos: this.totalJornales(ctx, cc),
      fondoCapacitacionPorcentaje: cc.fondoCapacitacionPorcentaje,
    });
  }
}
