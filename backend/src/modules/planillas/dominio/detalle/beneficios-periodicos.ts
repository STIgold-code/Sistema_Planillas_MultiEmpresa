/**
 * Beneficios periódicos del detalle (gratificación, CTS, beneficios truncos)
 * como funciones PURAS del dominio.
 *
 * Reproducen al céntimo la matemática del motor legacy (`gratificaciones.ts`,
 * `cts.ts`, `beneficios-truncos.ts`). La resolución de MESES/DÍAS del semestre
 * (que dependía de la fecha de ingreso vía luxon) se hace en el borde de
 * aplicación y se inyecta ya calculada, manteniendo el dominio libre de fechas
 * con timezone. Los factores legales (asignación familiar, tasa EsSalud de la
 * bonificación 30334) provienen del puerto `ParametrosLegales`.
 */
import { redondear2 } from './redondeo';

export interface GratificacionDetalle {
  gratificacionMonto: number;
  bonifExtraordinariaMonto: number;
}

/**
 * Gratificación (Ley 27735) + bonificación extraordinaria (Ley 30334).
 * Solo paga en julio (7) y diciembre (12).
 *
 * @param mesesGratificacion Meses completos del semestre (resueltos en el borde).
 * @param essaludTasa Tasa EsSalud vigente (base de la bonificación 30334).
 */
export function calcularGratificacionDetalle(
  mes: number,
  remuneracionComputable: number,
  mesesGratificacion: number,
  essaludTasa: number,
): GratificacionDetalle {
  if (mes !== 7 && mes !== 12) {
    return { gratificacionMonto: 0, bonifExtraordinariaMonto: 0 };
  }
  const gratificacionMonto = redondear2(
    remuneracionComputable * (mesesGratificacion / 6),
  );
  return {
    gratificacionMonto,
    bonifExtraordinariaMonto: redondear2(gratificacionMonto * essaludTasa),
  };
}

/**
 * CTS (D.S. 001-97-TR). Solo deposita en mayo (5) y noviembre (11).
 * Fórmula: (computable/12)×meses + (computable/360)×días.
 */
export function calcularCtsDetalle(
  mes: number,
  remuneracionComputable: number,
  mesesCts: number,
  diasCts: number,
): number {
  if (mes !== 5 && mes !== 11) return 0;
  return redondear2(
    (remuneracionComputable / 12) * mesesCts +
      (remuneracionComputable / 360) * diasCts,
  );
}

export interface BeneficiosTruncos {
  ctsTrunca: number;
  gratTrunca: number;
  vacTruncas: number;
  totalBeneficiosSociales: number;
}

/**
 * Beneficios truncos para empleados que cesan en el período. Reproduce
 * `beneficios-truncos.ts` del legacy al céntimo.
 *
 * @param asignacionFamiliarMonto Monto de asignación familiar (0 si no aplica).
 */
export function calcularBeneficiosTruncosDetalle(
  empleadoCesa: boolean,
  mes: number,
  diasTrabajados: number,
  remComputableCts: number,
  remComputableGratificacion: number,
  sueldoBase: number,
  tieneAsignacionFamiliar: boolean,
  tieneFechaIngreso: boolean,
  asignacionFamiliarMonto: number,
): BeneficiosTruncos {
  const vacio: BeneficiosTruncos = {
    ctsTrunca: 0,
    gratTrunca: 0,
    vacTruncas: 0,
    totalBeneficiosSociales: 0,
  };
  if (!empleadoCesa) return vacio;

  let mesesDesdeUltimoCts = 0;
  if (mes <= 5) mesesDesdeUltimoCts = mes - 1 + 2;
  else if (mes <= 11) mesesDesdeUltimoCts = mes - 5;
  else mesesDesdeUltimoCts = mes - 11;

  const ctsTrunca = redondear2(
    (remComputableCts / 12) * mesesDesdeUltimoCts +
      (remComputableCts / 360) * diasTrabajados,
  );

  const mesesDesdeInicioSemestre = mes <= 6 ? mes : mes - 6;
  const gratTrunca = redondear2(
    (remComputableGratificacion / 6) * mesesDesdeInicioSemestre,
  );

  let vacTruncas = 0;
  if (tieneFechaIngreso) {
    const baseVac =
      sueldoBase + (tieneAsignacionFamiliar ? asignacionFamiliarMonto : 0);
    const mesesTrabajadosAnio = Math.min(12, mes);
    vacTruncas = redondear2((baseVac / 12) * mesesTrabajadosAnio);
  }

  return {
    ctsTrunca,
    gratTrunca,
    vacTruncas,
    totalBeneficiosSociales: redondear2(ctsTrunca + gratTrunca + vacTruncas),
  };
}
