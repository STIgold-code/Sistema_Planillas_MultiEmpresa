/**
 * Totalización de descuentos y neto del detalle de planilla (función PURA).
 *
 * UNA SOLA FUENTE DE VERDAD: los totales se DERIVAN de las columnas de descuento
 * que ya viven en el detalle — las mismas que imprime la boleta — y nunca de un
 * recálculo paralelo aplicando tasas sobre alguna base.
 *
 * Por qué existe: el DTO se arma en dos pasos. Primero `calcularDetalleCompleto`
 * produce los ~130 campos; después el borde de aplicación PISA las columnas
 * load-bearing (`onp`, `afp_*`, `renta_5ta`, entre otras) con los montos del
 * motor de régimen, que es la fuente de verdad. Si el total se calcula en el
 * primer paso, queda respondiendo a una base distinta de la que termina impresa
 * en la boleta: el trabajador ve un descuento y cobra otro neto. Por eso la
 * totalización se aplica SIEMPRE al final, sobre las columnas ya definitivas.
 *
 * Espejos legacy que NO se suman dos veces:
 *  - `afp_seguro` es el espejo de `afp_prima` (mismo importe, distinta etiqueta).
 *  - `quinta_categoria` es el espejo de `renta_5ta`: aquí se deriva, no se recibe.
 *  - `prestamos` es el agregado legacy: solo cuenta cuando `prestamo` está en 0,
 *    la misma regla de respaldo que aplica la boleta al imprimirlo.
 */
import { DetalleCompleto } from './tipos-detalle';
import { redondear2 } from './redondeo';

/**
 * Detalle sin los campos que esta función deriva. Se declaran como `Omit` para
 * que ningún llamador pueda inventar un total por su cuenta: la única manera de
 * obtener un `DetalleCompleto` válido es pasar por aquí.
 */
export type DetalleSinTotalesDescuento = Omit<
  DetalleCompleto,
  | 'quinta_categoria'
  | 'total_descuentos_ley'
  | 'total_descuentos_otros'
  | 'total_descuentos'
  | 'neto_pagar'
  | 'neto_mes'
>;

/**
 * Completa el detalle con `total_descuentos_ley`, `total_descuentos_otros`,
 * `total_descuentos`, el espejo `quinta_categoria` y el neto.
 *
 * Es IDEMPOTENTE: aplicarla sobre un detalle ya totalizado devuelve los mismos
 * totales, porque solo lee columnas y nunca los totales previos.
 */
export function totalizarDescuentos(
  detalle: DetalleSinTotalesDescuento,
): DetalleCompleto {
  const d = detalle;

  // Descuentos de LEY: aportes pensionarios del trabajador y renta de 5.ª.
  const totalDescuentosLey = redondear2(
    d.afp_aporte + d.afp_prima + d.afp_comision + d.onp + d.renta_5ta,
  );

  const prestamoEfectivo = d.prestamo > 0 ? d.prestamo : d.prestamos;

  // Descuentos que NO son de ley: recortes del tareo, adelantos, préstamos y
  // retenciones convencionales o judiciales.
  const totalDescuentosOtros = redondear2(
    d.descuento_faltas +
      d.descuento_dominical +
      d.descuento_permisos +
      d.descuento_tardanzas +
      d.descuento_feriado +
      d.descuento_sobregiro +
      d.descuento_reintegro +
      d.retencion_judicial +
      d.otros_descuentos +
      d.adelantos +
      d.adelanto_quincena +
      d.adelanto_vacacional +
      d.otros_adelantos +
      d.adelanto_cts +
      d.adelanto_gratificacion +
      prestamoEfectivo,
  );

  const totalDescuentos = redondear2(totalDescuentosLey + totalDescuentosOtros);
  const netoPagar = redondear2(d.total_ingresos - totalDescuentos);

  return {
    ...d,
    quinta_categoria: d.renta_5ta,
    total_descuentos_ley: totalDescuentosLey,
    total_descuentos_otros: totalDescuentosOtros,
    total_descuentos: totalDescuentos,
    neto_pagar: netoPagar,
    neto_mes: netoPagar,
  };
}
