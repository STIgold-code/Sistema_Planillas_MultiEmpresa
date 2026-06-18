/**
 * RegimenAgrario — estrategia del régimen agrario (Ley 31110).
 *
 * NO CERTIFICADO PARA PRODUCCIÓN (`certificadoProduccion = false`): aún hay
 * puntos pendientes de verificación de un contador peruano (días de vacaciones
 * 15 vs 30). El motor calcula, pero un consumidor NO debe emitir nómina real sin
 * comprobar `certificadoProduccion`.
 *
 * Cómo se levanta el flag: cuando el contador confirme los días de vacaciones
 * (y se quite el `it.skip` del spec de vacaciones), cambiar
 * `CERTIFICADO_PRODUCCION` a `true`.
 *
 * Reglas (✅ CONFIRMADO salvo nota):
 *   - Gratificación = 16.66% RB (sistema separado) o prorrateada en el jornal.
 *   - CTS = 9.72% RB (separado) o prorrateada.
 *   - EsSalud agrario por tamaño de empresa (GRANDE 9% / PEQUEÑA 6% en 2026),
 *     base = Remuneración Básica.
 *   - Asignación familiar = 10% RMV si tiene hijos.
 *   - Vacaciones: ⚠️ NO CONFIRMADO (15 vs 30). El N° de días llega como dato
 *     versionado desde ParametrosLegales; el goce se valoriza por separado.
 *
 * Puro: no conoce Prisma ni Nest. Todos los factores vía `ParametrosLegales`
 * (cero hardcodeo): la confirmación del contador es un cambio de DATO.
 */
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import {
  ContextoCalculo,
  RegimenLaboral,
  ResultadoConcepto,
  TamanoEmpresa,
} from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import {
  calcularGratiAgraria,
  calcularCtsAgraria,
} from '../conceptos/beneficios-agrario-separado';
import { calcularProrrateoAgrario } from '../conceptos/prorrateo-agrario';
import { calcularVacaciones } from '../conceptos/vacaciones';
import { calcularAsignacionFamiliar } from '../conceptos/asignacion-familiar';
import { calcularSaludAgrario } from '../conceptos/salud-agrario';

const SIN_CONCEPTOS: ResultadoConcepto = { conceptos: [] };

/**
 * Guarda de certificación. `false` hasta que el contador confirme los puntos
 * ⚠️ NO CONFIRMADOS del agrario (días de vacaciones). Levantar a `true` SOLO
 * tras esa confirmación y al retirar los `it.skip` correspondientes.
 */
const CERTIFICADO_PRODUCCION = false;

export class RegimenAgrario implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.AGRARIO;
  readonly certificadoProduccion = CERTIFICADO_PRODUCCION;

  gratificacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    if (ctx.usaProrrateoAgrario) return SIN_CONCEPTOS; // va prorrateada en el jornal
    const a = params.agrario(ctx.periodo.fecha);
    return calcularGratiAgraria({
      remuneracionBasica: ctx.remuneracionComputable,
      gratiPctRb: a.gratiPctRb,
      ctsPctRb: a.ctsPctRb,
    });
  }

  cts(ctx: ContextoCalculo, params: ParametrosLegales): ResultadoConcepto {
    if (ctx.usaProrrateoAgrario) return SIN_CONCEPTOS;
    const a = params.agrario(ctx.periodo.fecha);
    return calcularCtsAgraria({
      remuneracionBasica: ctx.remuneracionComputable,
      gratiPctRb: a.gratiPctRb,
      ctsPctRb: a.ctsPctRb,
    });
  }

  /**
   * Remuneración diaria prorrateada (sistema (b) de la Ley 31110). Lo expone la
   * estrategia como método propio; el orquestador lo invoca cuando
   * `usaProrrateoAgrario` es true.
   */
  remuneracionDiaria(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    if (!ctx.usaProrrateoAgrario) return SIN_CONCEPTOS;
    const a = params.agrario(ctx.periodo.fecha);
    return calcularProrrateoAgrario({
      remuneracionBasica: ctx.remuneracionComputable,
      gratiPctRb: a.gratiPctRb,
      ctsPctRb: a.ctsPctRb,
      diasTrabajados: ctx.resumenTareo.diasTrabajados,
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
    const a = params.agrario(ctx.periodo.fecha);
    const tasa =
      ctx.tamanoEmpresa === TamanoEmpresa.PEQUENA
        ? a.essaludTasaPequena
        : a.essaludTasaGrande;
    return calcularSaludAgrario({
      remuneracionBasica: ctx.remuneracionComputable,
      essaludTasa: tasa,
    });
  }
}
