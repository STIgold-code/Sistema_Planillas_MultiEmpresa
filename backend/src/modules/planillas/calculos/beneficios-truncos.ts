/**
 * Cálculo de beneficios truncos para empleados que cesan.
 *
 * - CTS trunca: proporcional desde último depósito (mayo o noviembre)
 * - Gratificación trunca: proporcional desde inicio del semestre
 * - Vacaciones truncas: proporcional según D.L. 713
 *
 * Se calculan SOLO cuando el empleado cesa en el período actual.
 */
import { round2, ASIGNACION_FAMILIAR } from '../planillas.config';

export interface ResultadoBeneficiosTruncos {
  ctsTrunca: number;
  gratTrunca: number;
  vacTruncas: number;
  totalBeneficiosSociales: number;
}

/**
 * Calcula los beneficios truncos de un empleado que cesa.
 *
 * @param empleadoCesa Si el empleado cesa en este período
 * @param mes Mes de cálculo (1-12)
 * @param diasTrabajados Días efectivamente trabajados en el mes
 * @param remComputableCts Remuneración computable para CTS
 * @param remComputableGratificacion Remuneración computable para gratificación
 * @param sueldoBase Sueldo base del empleado
 * @param tieneAsigFamiliar Si el empleado tiene asignación familiar
 * @param tieneFechaIngreso Si el empleado tiene fecha de ingreso
 */
export function calcularBeneficiosTruncos(
  empleadoCesa: boolean,
  mes: number,
  diasTrabajados: number,
  remComputableCts: number,
  remComputableGratificacion: number,
  sueldoBase: number,
  tieneAsigFamiliar: boolean,
  tieneFechaIngreso: boolean,
): ResultadoBeneficiosTruncos {
  const resultado: ResultadoBeneficiosTruncos = {
    ctsTrunca: 0,
    gratTrunca: 0,
    vacTruncas: 0,
    totalBeneficiosSociales: 0,
  };

  if (!empleadoCesa) return resultado;

  // CTS trunca: proporcional desde último depósito
  let mesesDesdeUltimoCts = 0;
  if (mes <= 5) {
    mesesDesdeUltimoCts = mes - 1 + 2;
  } else if (mes <= 11) {
    mesesDesdeUltimoCts = mes - 5;
  } else {
    mesesDesdeUltimoCts = mes - 11;
  }

  const diasFraccionCts = diasTrabajados;

  resultado.ctsTrunca = round2(
    (remComputableCts / 12) * mesesDesdeUltimoCts +
      (remComputableCts / 360) * diasFraccionCts,
  );

  // Gratificación trunca: proporcional desde inicio del semestre
  let mesesDesdeInicioSemestre = 0;
  if (mes <= 6) {
    mesesDesdeInicioSemestre = mes;
  } else {
    mesesDesdeInicioSemestre = mes - 6;
  }

  resultado.gratTrunca = round2(
    (remComputableGratificacion / 6) * mesesDesdeInicioSemestre,
  );

  // Vacaciones truncas (D.L. 713)
  if (tieneFechaIngreso) {
    const remComputableVacTruncas =
      sueldoBase + (tieneAsigFamiliar ? ASIGNACION_FAMILIAR : 0);
    const mesesTrabajadosAnio = Math.min(12, mes);
    resultado.vacTruncas = round2(
      (remComputableVacTruncas / 12) * mesesTrabajadosAnio,
    );
  }

  resultado.totalBeneficiosSociales = round2(
    resultado.ctsTrunca + resultado.gratTrunca + resultado.vacTruncas,
  );

  return resultado;
}
