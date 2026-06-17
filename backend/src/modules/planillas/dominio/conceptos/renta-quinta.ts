/**
 * Concepto: renta-quinta (Impuesto a la Renta de 5ta categoría).
 *
 * Pure refactor of `planillas.config.ts#calcularIR5taCategoria`. UIT y tramos
 * se resuelven vía `ParametrosLegales` por la fecha del período — sin números
 * mágicos en el dominio.
 *
 * Procedimiento (Art. 40 Reglamento LIR):
 * 1. Proyectar renta bruta anual.
 * 2. Sumar gratificaciones (julio y diciembre, si aún no pagadas).
 * 3. Restar 7 UIT (deducción fija para dependientes).
 * 4. Aplicar tasas progresivas por tramo.
 * 5. Descontar retenciones previas y dividir entre meses restantes.
 *
 * Régimen-agnostic: depende solo de la remuneración, el mes y los parámetros.
 */
import { ParametrosLegales } from '../parametros/parametros-legales';
import { ResultadoConcepto, TramoIR } from '../tipos';

export const CLAVE_RENTA_5TA = 'renta_5ta';

/** Deducción fija para trabajadores dependientes (en UITs). */
const DEDUCCION_UIT = 7;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

function impuestoAnualPorTramos(
  rentaNeta: number,
  uit: number,
  tramos: TramoIR[],
): number {
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

export function calcularRentaQuinta(
  remuneracionMensual: number,
  mes: number,
  fecha: Date,
  params: ParametrosLegales,
  acumuladoAnterior = 0,
  retencionesPrevias = 0,
): ResultadoConcepto {
  if (remuneracionMensual <= 0) return { conceptos: [] };

  const uit = params.uit(fecha);
  const tramos = params.tramosIR(fecha);

  const mesesRestantes = 12 - mes + 1;
  const rentaProyectada =
    acumuladoAnterior + remuneracionMensual * mesesRestantes;

  let gratificaciones = 0;
  if (mes <= 7) gratificaciones += remuneracionMensual;
  if (mes <= 12) gratificaciones += remuneracionMensual;

  const rentaBrutaAnual = rentaProyectada + gratificaciones;
  const rentaNetaAnual = Math.max(0, rentaBrutaAnual - DEDUCCION_UIT * uit);
  if (rentaNetaAnual <= 0) return { conceptos: [] };

  const impuestoAnual = impuestoAnualPorTramos(rentaNetaAnual, uit, tramos);
  const pendiente = Math.max(0, impuestoAnual - retencionesPrevias);
  const retencionMensual = redondear2(pendiente / mesesRestantes);

  if (retencionMensual <= 0) return { conceptos: [] };

  return {
    conceptos: [
      {
        clave: CLAVE_RENTA_5TA,
        descripcion: 'Retención IR 5ta categoría',
        tipo: 'descuento',
        monto: retencionMensual,
      },
    ],
  };
}
