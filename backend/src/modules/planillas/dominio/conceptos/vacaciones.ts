/**
 * Concepto régimen-variable: remuneración vacacional (descanso gozado).
 *
 * Refleja la `remuneracion_vacacional` del motor legacy: por los días de
 * vacaciones efectivamente gozados en el período se paga (sueldo/30)·días.
 * El derecho vacacional (30 días GENERAL, 15 REMYPE) lo decide la estrategia;
 * aquí solo se valoriza el goce del período.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_VACACIONES = 'vacaciones';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export function calcularVacaciones(
  remuneracionMensual: number,
  diasVacaciones: number,
): ResultadoConcepto {
  if (diasVacaciones <= 0) return { conceptos: [] };

  const monto = redondear2((remuneracionMensual / 30) * diasVacaciones);
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_VACACIONES,
    descripcion: 'Remuneración vacacional',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
