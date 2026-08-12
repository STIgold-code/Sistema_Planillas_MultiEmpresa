/**
 * IR 5ta categoría (Art. 53 LIR) como función PURA del dominio.
 *
 * Reproduce al céntimo `calcularIR5taCategoria` del legacy. La UIT y los tramos
 * progresivos provienen del puerto `ParametrosLegales` (cero magic numbers) y la
 * aritmética de la escala se comparte con el motor de régimen
 * (`conceptos/escala-impuesto-renta`) para que los dos no puedan desalinearse.
 */
import { TramoIR } from '../tipos';
import {
  impuestoAnualPorTramos,
  impuestoIngresosExtraordinarios,
} from '../conceptos/escala-impuesto-renta';

const DEDUCCION_UIT = 7;

/** Tasa plana no domiciliados (Art. 54 inc. f y Art. 76 LIR). */
const TASA_NO_DOMICILIADO = 0.3;

/**
 * @param ingresosExtraordinariosMes Montos distintos de la remuneración
 * ordinaria puestos a disposición ESTE mes (bonificación extraordinaria de la
 * Ley 30334, utilidades, reintegros). D.S. 122-94-EF art. 40 inc. e).
 */
export function calcularRentaQuintaDetalle(
  remuneracionMensual: number,
  mes: number,
  uit: number,
  tramos: TramoIR[],
  acumuladoAnterior: number,
  retencionesPrevias: number,
  domiciliado = true,
  ingresosExtraordinariosMes = 0,
): number {
  const extraordinarios = Math.max(0, ingresosExtraordinariosMes);
  if (remuneracionMensual <= 0 && extraordinarios <= 0) return 0;

  // NO DOMICILIADO: 30% mensual definitivo, sin deducción ni proyección. Los
  // extraordinarios del mes también son renta puesta a disposición.
  if (!domiciliado) {
    return (
      Math.round(
        (remuneracionMensual + extraordinarios) * TASA_NO_DOMICILIADO * 100,
      ) / 100
    );
  }

  const mesesRestantes = 12 - mes + 1;
  const rentaProyectada =
    acumuladoAnterior + remuneracionMensual * mesesRestantes;

  let gratificaciones = 0;
  if (mes <= 7) gratificaciones += remuneracionMensual;
  if (mes <= 12) gratificaciones += remuneracionMensual;

  const rentaBrutaAnual = rentaProyectada + gratificaciones;
  const deduccion = DEDUCCION_UIT * uit;
  const rentaNetaAnual = Math.max(0, rentaBrutaAnual - deduccion);

  // Cuota ordinaria del mes (incisos a–d): impuesto anual proyectado menos lo
  // ya retenido, prorrateado entre los meses que faltan del ejercicio.
  const impuestoAnual = impuestoAnualPorTramos(rentaNetaAnual, uit, tramos);
  const retencionPendiente = Math.max(0, impuestoAnual - retencionesPrevias);
  const cuotaOrdinaria = retencionPendiente / mesesRestantes;

  // Inciso e): el extraordinario del mes no se proyecta — su impuesto adicional
  // se retiene íntegro en este mes.
  const impuestoExtraordinarios = impuestoIngresosExtraordinarios(
    rentaBrutaAnual,
    extraordinarios,
    impuestoAnual,
    deduccion,
    uit,
    tramos,
  );

  return Math.round((cuotaOrdinaria + impuestoExtraordinarios) * 100) / 100;
}
