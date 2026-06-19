/**
 * Descuentos pensionarios (AFP/ONP) como función PURA del dominio.
 * Reproduce al céntimo `calculos/deducciones.ts`. Las tasas ya vienen como
 * fracción en la `AfiliacionPensionaria` (el borde las escala desde %).
 */
import { AfiliacionPensionaria, SistemaPensionario } from '../tipos';
import { redondear2 } from './redondeo';

const ONP_POR_DEFECTO = 0.13;

export interface DeduccionesPension {
  afpAporte: number;
  afpPrima: number;
  afpSeguro: number;
  afpComision: number;
  onp: number;
}

export function calcularDeduccionesPensionDetalle(
  remuneracionAfecta: number,
  afiliacion: AfiliacionPensionaria | null,
): DeduccionesPension {
  const vacio: DeduccionesPension = {
    afpAporte: 0,
    afpPrima: 0,
    afpSeguro: 0,
    afpComision: 0,
    onp: 0,
  };
  if (!afiliacion) return vacio;

  if (afiliacion.sistema === SistemaPensionario.AFP) {
    const t = afiliacion.tasas;
    if (!t) return vacio;
    const afpPrima = redondear2(remuneracionAfecta * t.primaSeguro);
    return {
      afpAporte: redondear2(remuneracionAfecta * t.aporteObligatorio),
      afpPrima,
      afpSeguro: afpPrima,
      afpComision: redondear2(remuneracionAfecta * t.comisionFlujo),
      onp: 0,
    };
  }

  const tasaOnp = afiliacion.tasas?.aporteObligatorio || ONP_POR_DEFECTO;
  return { ...vacio, onp: redondear2(remuneracionAfecta * tasaOnp) };
}
