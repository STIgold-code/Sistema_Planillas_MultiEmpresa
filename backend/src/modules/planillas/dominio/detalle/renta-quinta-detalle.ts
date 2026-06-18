/**
 * IR 5ta categoría (Art. 53 LIR) como función PURA del dominio.
 *
 * Reproduce al céntimo `calcularIR5taCategoria` del legacy. La UIT y los tramos
 * progresivos provienen del puerto `ParametrosLegales` (cero magic numbers).
 */
import { TramoIR } from '../tipos';

const DEDUCCION_UIT = 7;

export function calcularRentaQuintaDetalle(
  remuneracionMensual: number,
  mes: number,
  uit: number,
  tramos: TramoIR[],
  acumuladoAnterior: number,
  retencionesPrevias: number,
): number {
  if (remuneracionMensual <= 0) return 0;

  const mesesRestantes = 12 - mes + 1;
  const rentaProyectada =
    acumuladoAnterior + remuneracionMensual * mesesRestantes;

  let gratificaciones = 0;
  if (mes <= 7) gratificaciones += remuneracionMensual;
  if (mes <= 12) gratificaciones += remuneracionMensual;

  const rentaBrutaAnual = rentaProyectada + gratificaciones;
  const rentaNetaAnual = Math.max(0, rentaBrutaAnual - DEDUCCION_UIT * uit);
  if (rentaNetaAnual <= 0) return 0;

  let impuestoAnual = 0;
  let rentaRestante = rentaNetaAnual;
  let tramoAnterior = 0;
  for (const tramo of tramos) {
    const limiteTramo = tramo.hasta * uit;
    const baseTramo = Math.min(rentaRestante, limiteTramo - tramoAnterior);
    if (baseTramo > 0) {
      impuestoAnual += baseTramo * tramo.tasa;
      rentaRestante -= baseTramo;
      tramoAnterior = limiteTramo;
    }
    if (rentaRestante <= 0) break;
  }

  const retencionPendiente = Math.max(0, impuestoAnual - retencionesPrevias);
  return Math.round((retencionPendiente / mesesRestantes) * 100) / 100;
}
