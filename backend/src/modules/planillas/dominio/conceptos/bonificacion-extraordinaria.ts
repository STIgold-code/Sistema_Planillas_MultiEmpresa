/**
 * Concepto régimen-variable: bonificación extraordinaria (Ley 30334).
 *
 * Cuando aplica gratificación, el aporte EsSalud que el empleador habría pagado
 * sobre ella (9%, o 6.75% si EPS) se entrega al trabajador como bonificación
 * extraordinaria. Afecta a renta; inafecta a EsSalud/ONP.
 *
 * Régimen-variable: deriva de la gratificación, por lo que cada estrategia la
 * compone junto a su `gratificacion`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_BONIF_EXTRAORDINARIA = 'bonificacion_extraordinaria';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export function calcularBonificacionExtraordinaria(
  montoGratificacion: number,
  tasaEssalud: number,
): ResultadoConcepto {
  if (montoGratificacion <= 0) return { conceptos: [] };

  const monto = redondear2(montoGratificacion * tasaEssalud);
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_BONIF_EXTRAORDINARIA,
    descripcion: 'Bonificación extraordinaria (Ley 30334)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
