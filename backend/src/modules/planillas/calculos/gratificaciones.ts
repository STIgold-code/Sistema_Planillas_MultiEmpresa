/**
 * Cálculo de gratificaciones según legislación peruana.
 *
 * - Ley 27735: Gratificaciones Fiestas Patrias (julio) y Navidad (diciembre)
 * - Ley 30334: Bonificación extraordinaria del 9% (equivale al aporte EsSalud)
 *
 * Se paga proporcionalmente: (rem.computable × meses/6)
 * Meses = meses completos trabajados en el semestre
 *   - Julio: semestre enero–junio
 *   - Diciembre: semestre julio–noviembre
 */
import { round2, ESSALUD_PORCENTAJE } from '../planillas.config';
import { leerFechaPrisma } from '../../../common/utils/datetime.util';

export interface ResultadoGratificacion {
  gratificacionMonto: number;
  bonifExtraordinariaMonto: number;
  mesesGratificacion: number;
}

/**
 * Calcula gratificación y bonificación extraordinaria.
 *
 * @param mes Mes de cálculo (1-12). Solo genera monto si es 7 o 12.
 * @param anio Año de cálculo
 * @param gratBase Remuneración base para gratificación (sueldo sin asig.familiar)
 * @param fechaIngreso Fecha de ingreso del empleado (Prisma Date)
 * @param promedioHE Promedio de horas extras del semestre
 * @param promedioComisiones Promedio de comisiones del semestre
 * @param promedioBonificaciones Promedio de bonificaciones del semestre
 */
export function calcularGratificacion(
  mes: number,
  anio: number,
  gratBase: number,
  fechaIngreso: Date | null,
  promedioHE: number = 0,
  promedioComisiones: number = 0,
  promedioBonificaciones: number = 0,
): ResultadoGratificacion {
  const resultado: ResultadoGratificacion = {
    gratificacionMonto: 0,
    bonifExtraordinariaMonto: 0,
    mesesGratificacion: 0,
  };

  const esGratificacion = mes === 7 || mes === 12;
  if (!esGratificacion) return resultado;

  // Calcular meses trabajados en el semestre
  const fechaIngresoLux = fechaIngreso ? leerFechaPrisma(fechaIngreso) : null;

  let inicioSemestre: Date;
  if (mes === 7) {
    inicioSemestre = new Date(anio, 0, 1); // 1 de enero
  } else {
    inicioSemestre = new Date(anio, 6, 1); // 1 de julio
  }

  let mesesGratificacion: number;

  if (fechaIngresoLux && fechaIngresoLux.toJSDate() > inicioSemestre) {
    const mesIngreso = fechaIngresoLux.month;
    const diaIngreso = fechaIngresoLux.day;

    if (mes === 7) {
      mesesGratificacion = 7 - mesIngreso;
      if (diaIngreso > 1) {
        mesesGratificacion = Math.max(0, mesesGratificacion - 1);
      }
    } else {
      const mesesDesdeIngreso = mesIngreso <= 6 ? 6 : 12 - mesIngreso + 1;
      mesesGratificacion = Math.min(6, mesesDesdeIngreso);
      if (diaIngreso > 1 && mesIngreso >= 7) {
        mesesGratificacion = Math.max(0, mesesGratificacion - 1);
      }
    }
  } else {
    mesesGratificacion = 6;
  }

  // Remuneración computable
  const remuneracionComputableGrat =
    gratBase + promedioHE + promedioComisiones + promedioBonificaciones;

  resultado.mesesGratificacion = mesesGratificacion;
  resultado.gratificacionMonto = round2(
    remuneracionComputableGrat * (mesesGratificacion / 6),
  );
  resultado.bonifExtraordinariaMonto = round2(
    resultado.gratificacionMonto * ESSALUD_PORCENTAJE,
  );

  return resultado;
}
