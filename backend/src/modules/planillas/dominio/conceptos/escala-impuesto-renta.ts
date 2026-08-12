/**
 * Escala progresiva del Impuesto a la Renta (Art. 53 LIR) y tratamiento de los
 * ingresos extraordinarios del mes (D.S. 122-94-EF art. 40 inc. e).
 *
 * Aritmética COMPARTIDA por los dos motores que retienen renta de 5.ª:
 * `conceptos/renta-quinta` (motor de régimen, fuente de verdad de la columna
 * `renta_5ta`) y `detalle/renta-quinta-detalle` (motor del DTO completo). Vive
 * en un solo lugar precisamente para que no puedan desalinearse.
 *
 * Sin números mágicos: la UIT y los tramos llegan desde `ParametrosLegales`.
 */
import { TramoIR } from '../tipos';

/**
 * Impuesto anual sobre la renta NETA, aplicando las tasas de cada tramo solo a
 * la porción que cae dentro de él (los tramos se expresan en UITs).
 */
export function impuestoAnualPorTramos(
  rentaNeta: number,
  uit: number,
  tramos: TramoIR[],
): number {
  if (rentaNeta <= 0) return 0;

  let impuesto = 0;
  let restante = rentaNeta;
  let limiteAnterior = 0;

  for (const tramo of tramos) {
    const limite = tramo.hasta * uit;
    const base = Math.min(restante, limite - limiteAnterior);
    if (base > 0) {
      impuesto += base * tramo.tasa;
      restante -= base;
      limiteAnterior = limite;
    }
    if (restante <= 0) break;
  }
  return impuesto;
}

/**
 * Impuesto ADICIONAL que generan los ingresos extraordinarios puestos a
 * disposición en el mes (D.S. 122-94-EF art. 40 inc. e): la bonificación
 * extraordinaria de la Ley 30334, las utilidades, los reintegros.
 *
 * A diferencia de la remuneración ordinaria, NO se proyectan al año: se suman a
 * la renta bruta del ejercicio, se recalcula el impuesto anual y la diferencia
 * contra el impuesto sin ellos se retiene ÍNTEGRA en el mes en que se perciben
 * (no se prorratea entre los meses que faltan).
 *
 * La deducción de 7 UIT se aplica sobre el total, así que quien sigue por
 * debajo del mínimo no tributa y quien lo cruza gracias al extraordinario
 * tributa solo por el exceso.
 *
 * @param rentaBrutaAnual Renta bruta anual proyectada, ANTES de la deducción.
 * @param extraordinarios Monto extraordinario del mes (0 si no hay).
 * @param impuestoAnualOrdinario Impuesto anual ya calculado sin extraordinarios.
 * @param deduccion Deducción fija aplicable (7 UIT para dependientes).
 */
export function impuestoIngresosExtraordinarios(
  rentaBrutaAnual: number,
  extraordinarios: number,
  impuestoAnualOrdinario: number,
  deduccion: number,
  uit: number,
  tramos: TramoIR[],
): number {
  if (extraordinarios <= 0) return 0;

  const rentaNetaConExtraordinarios = Math.max(
    0,
    rentaBrutaAnual + extraordinarios - deduccion,
  );
  const impuestoConExtraordinarios = impuestoAnualPorTramos(
    rentaNetaConExtraordinarios,
    uit,
    tramos,
  );
  return Math.max(0, impuestoConExtraordinarios - impuestoAnualOrdinario);
}
