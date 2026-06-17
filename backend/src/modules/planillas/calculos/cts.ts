/**
 * Cálculo de CTS según D.S. 001-97-TR
 *
 * Se deposita en mayo y noviembre.
 * - Mayo: semestre noviembre(año anterior)–abril
 * - Noviembre: semestre mayo–octubre
 *
 * Fórmula: (rem.computable / 12) × meses + (rem.computable / 360) × días
 * Rem.computable = sueldo + asig.familiar + 1/6 gratificación + promedios
 */
import { round2 } from '../planillas.config';
import { leerFechaPrisma } from '../../../common/utils/datetime.util';

export interface ResultadoCts {
  ctsMonto: number;
  mesesCts: number;
  diasCts: number;
}

/**
 * Calcula la CTS del período.
 *
 * @param mes Mes de cálculo (1-12). Solo genera monto si es 5 o 11.
 * @param anio Año de cálculo
 * @param ctsBase Sueldo base para CTS
 * @param sextoGratificacion 1/6 de la última gratificación
 * @param promedioHE Promedio de horas extras
 * @param promedioComisiones Promedio de comisiones
 * @param fechaIngreso Fecha de ingreso del empleado (Prisma Date)
 */
export function calcularCts(
  mes: number,
  anio: number,
  ctsBase: number,
  sextoGratificacion: number,
  promedioHE: number,
  promedioComisiones: number,
  fechaIngreso: Date | null,
): ResultadoCts {
  const resultado: ResultadoCts = { ctsMonto: 0, mesesCts: 0, diasCts: 0 };

  const esCts = mes === 5 || mes === 11;
  if (!esCts) return resultado;

  const fechaIngresoLux = fechaIngreso ? leerFechaPrisma(fechaIngreso) : null;

  let inicioSemestre: Date;
  if (mes === 5) {
    inicioSemestre = new Date(anio - 1, 10, 1); // 1 de noviembre año anterior
  } else {
    inicioSemestre = new Date(anio, 4, 1); // 1 de mayo
  }

  let mesesCts: number;
  let diasCts = 0;

  if (fechaIngresoLux && fechaIngresoLux.toJSDate() > inicioSemestre) {
    const mesIngreso = fechaIngresoLux.month;
    const anioIngreso = fechaIngresoLux.year;
    const diaIngreso = fechaIngresoLux.day;

    if (mes === 5) {
      if (anioIngreso === anio) {
        mesesCts = 5 - mesIngreso;
      } else if (anioIngreso === anio - 1 && mesIngreso >= 11) {
        mesesCts = 12 - mesIngreso + 1 + 4;
      } else {
        mesesCts = 6;
      }
    } else {
      if (anioIngreso === anio && mesIngreso >= 5) {
        mesesCts = 11 - mesIngreso;
      } else {
        mesesCts = 6;
      }
    }

    if (diaIngreso > 1 && mesesCts > 0) {
      const diasDelMesIngreso = new Date(anioIngreso, mesIngreso, 0).getDate();
      diasCts = diasDelMesIngreso - diaIngreso + 1;
      mesesCts = Math.max(0, mesesCts - 1);
    }
  } else {
    mesesCts = 6;
    diasCts = 0;
  }

  const remuneracionComputableCts =
    ctsBase + sextoGratificacion + promedioHE + promedioComisiones;

  resultado.mesesCts = mesesCts;
  resultado.diasCts = diasCts;
  resultado.ctsMonto = round2(
    (remuneracionComputableCts / 12) * mesesCts +
      (remuneracionComputableCts / 360) * diasCts,
  );

  return resultado;
}
