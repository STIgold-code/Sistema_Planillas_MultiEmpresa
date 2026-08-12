/**
 * RegimenGeneral — estrategia del régimen laboral común (D.L. 728).
 *
 * Implementa `CalculadoraRegimen` componiendo los conceptos régimen-variables
 * con los factores del régimen general:
 *   - Gratificación: 1 sueldo completo por semestre (factor 1).
 *   - CTS: 1 sueldo por semestre, incluye 1/6 de gratificación (factor 1).
 *   - Computable de CTS: remuneración básica del período + asignación familiar,
 *     que es remuneración regular (Ley 25129).
 *   - Computable de gratificación: la vigente AL CIERRE del semestre + el
 *     promedio de las variables regulares (D.S. 005-2002-TR art. 3.2).
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
import {
  baseComputableGratificacion,
  calcularGratificacion,
  CLAVE_GRATIFICACION,
} from '../conceptos/gratificacion';
import { calcularCts } from '../conceptos/cts';
import { calcularVacaciones } from '../conceptos/vacaciones';
import {
  calcularAsignacionFamiliar,
  computableConAsignacionFamiliar,
} from '../conceptos/asignacion-familiar';
import { calcularSaludEmpleador } from '../conceptos/salud-empleador';

export class RegimenGeneral implements CalculadoraRegimen {
  readonly regimen = RegimenLaboral.GENERAL;
  readonly certificadoProduccion = true;

  conceptosRegimen(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return {
      conceptos: [
        ...this.gratificacion(ctx, params).conceptos,
        ...this.cts(ctx, params).conceptos,
        ...this.vacaciones(ctx).conceptos,
        ...this.asignacionFamiliar(ctx, params).conceptos,
        ...this.saludEmpleador(ctx, params).conceptos,
      ],
    };
  }

  aportaHaberBase(): boolean {
    return false;
  }

  clavesGratificacion(): string[] {
    return [CLAVE_GRATIFICACION];
  }

  /**
   * Remuneración computable de la CTS: la remuneración regular del PERÍODO
   * (D.S. 001-97-TR art. 9). La asignación familiar es remuneración regular
   * (Ley 25129), por lo que INTEGRA esta base — mismo criterio ya aplicado a la
   * base de EsSalud.
   */
  private computableCts(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): number {
    return computableConAsignacionFamiliar(
      ctx.remuneracionComputable,
      this.asignacionFamiliar(ctx, params),
    );
  }

  /**
   * Remuneración computable de la GRATIFICACIÓN: la vigente al CIERRE del
   * semestre más el promedio de las variables regulares (D.S. 005-2002-TR
   * art. 3.2 y remuneración regular). La asignación familiar se resuelve a esa
   * misma fecha de cierre, porque es parte de la remuneración computable.
   */
  private computableGratificacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): number {
    return computableConAsignacionFamiliar(
      baseComputableGratificacion(ctx.devengados),
      calcularAsignacionFamiliar(
        ctx.tieneHijos,
        params.asignacionFamiliar(ctx.devengados.fechaCierreSemestre),
      ),
    );
  }

  gratificacion(
    ctx: ContextoCalculo,
    params: ParametrosLegales,
  ): ResultadoConcepto {
    return calcularGratificacion(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: this.computableGratificacion(ctx, params),
        mesesTrabajados: ctx.devengados.mesesGratificacion,
        resumenTareo: ctx.resumenTareo,
        diasNoLaboradosSemestre: ctx.devengados.diasNoLaboradosSemestre,
      },
      1,
    );
  }

  cts(ctx: ContextoCalculo, params: ParametrosLegales): ResultadoConcepto {
    return calcularCts(
      {
        mes: ctx.periodo.mes,
        remuneracionComputable: this.computableCts(ctx, params),
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
    // La asignación familiar es remuneración afecta (Ley 25129): entra a la
    // base de EsSalud junto con la afecta que armó el orquestador.
    const asignacionFamiliar = this.asignacionFamiliar(
      ctx,
      params,
    ).conceptos.reduce((acc, c) => acc + c.monto, 0);
    return calcularSaludEmpleador({
      remuneracionAfecta: ctx.remuneracionAfecta + asignacionFamiliar,
      rmv: params.rmv(ctx.periodo.fecha),
      essaludTasa: params.essaludTasa(ctx.periodo.fecha),
      essaludMinimo: params.essaludMinimo(ctx.periodo.fecha),
    });
  }
}
