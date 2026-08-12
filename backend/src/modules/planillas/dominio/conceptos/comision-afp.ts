/**
 * Concepto: comisión de la AFP (SPP).
 *
 * En el SPP peruano el afiliado paga tres cosas distintas sobre su
 * remuneración: el aporte obligatorio (10%), la prima del seguro de invalidez y
 * sobrevivencia, y la COMISIÓN de la administradora. Solo la comisión depende de
 * una elección del trabajador (Ley 29903, art. 8):
 *
 *  - Comisión sobre FLUJO: un porcentaje único sobre la remuneración del mes.
 *  - Comisión MIXTA: un porcentaje MENOR sobre la remuneración del mes MÁS una
 *    comisión anual sobre el saldo del fondo. Ese segundo componente lo cobra la
 *    AFP contra el fondo del afiliado; el empleador NO lo retiene en planilla y
 *    por eso no interviene en este cálculo.
 *
 * Las dos tasas son por AFP y las publica la SBS; viven en
 * `regimenes_pensionarios` (`comision_flujo` y `comision_mixta_flujo`) junto al
 * resto de tasas de la administradora. Esta función solo ELIGE cuál aplica: no
 * es lógica de régimen laboral, es resolución de un parámetro del afiliado.
 *
 * Referencias: Ley 29903 art. 8; TUO Ley del SPP (D.S. 054-97-EF).
 */
import { TipoComisionAfp } from '../tipos';

/** Las dos tasas de comisión de una AFP, ya como fracción (0.0147 = 1.47%). */
export interface TasasComisionAfp {
  /** Comisión sobre flujo pura, aplicable al afiliado de modalidad FLUJO. */
  flujo: number;
  /** Componente sobre flujo de la comisión mixta, retenible en planilla. */
  mixtaFlujo: number;
}

/**
 * Tasa de comisión que se retiene en la boleta del afiliado.
 *
 * FALLBACK DOCUMENTADO: sin `tipo` declarado (dato histórico faltante) se aplica
 * la comisión sobre FLUJO, que es el comportamiento vigente antes de modelar la
 * modalidad. Así ninguna empresa que aún no cargó el dato ve moverse su planilla
 * por el solo hecho de desplegar este cambio.
 */
export function resolverTasaComisionAfp(
  tasas: TasasComisionAfp,
  tipo: TipoComisionAfp | null | undefined,
): number {
  return tipo === TipoComisionAfp.MIXTA ? tasas.mixtaFlujo : tasas.flujo;
}

/**
 * Valida contra el enum del dominio la modalidad que llega del borde (Prisma la
 * entrega como string, y los formularios pueden mandar cadena vacía). Cualquier
 * valor desconocido cae a `null`, es decir al fallback documentado a FLUJO: un
 * dato basura NUNCA debe traducirse en un descuento distinto al vigente.
 */
export function normalizarTipoComisionAfp(
  valor: unknown,
): TipoComisionAfp | null {
  return valor === TipoComisionAfp.MIXTA || valor === TipoComisionAfp.FLUJO
    ? valor
    : null;
}
