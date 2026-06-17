/**
 * Cálculo de deducciones pensionarias (AFP / ONP)
 *
 * AFP: 3 componentes (aporte obligatorio + prima seguro + comisión flujo)
 *   - Tasas dinámicas provenientes de BD (actualizadas por scraping SBS)
 *   - Se aplican sobre la remuneración afecta
 *
 * ONP: tasa fija del 13% (con fallback a constante si la BD tiene 0)
 *
 * Referencias:
 * - TUO Ley del SPP (D.S. 054-97-EF)
 * - Ley 19990 (ONP)
 */
import { round2, safeNumber, ONP_PORCENTAJE } from '../planillas.config';

interface RegimenPensionario {
  tipo: string;
  aporte_obligatorio: any; // Prisma Decimal | number | string | null
  prima_seguro: any;
  comision_flujo: any;
}

export interface ResultadoDeducciones {
  afpAporte: number;
  afpPrima: number;
  afpSeguro: number;
  afpComision: number;
  onp: number;
}

/**
 * Calcula los descuentos pensionarios según el régimen del empleado.
 *
 * @param remuneracionAfecta Base imponible (total ingresos afectos)
 * @param regimen Régimen pensionario del empleado (AFP o ONP), null si no tiene
 * @returns Desglose de descuentos pensionarios
 */
export function calcularDeducciones(
  remuneracionAfecta: number,
  regimen: RegimenPensionario | null,
): ResultadoDeducciones {
  const resultado: ResultadoDeducciones = {
    afpAporte: 0,
    afpPrima: 0,
    afpSeguro: 0,
    afpComision: 0,
    onp: 0,
  };

  if (!regimen) return resultado;

  if (regimen.tipo === 'AFP') {
    const aporteObligatorio = safeNumber(regimen.aporte_obligatorio) / 100;
    const primaSeguro = safeNumber(regimen.prima_seguro) / 100;
    const comisionFlujo = safeNumber(regimen.comision_flujo) / 100;

    resultado.afpAporte = round2(remuneracionAfecta * aporteObligatorio);
    resultado.afpPrima = round2(remuneracionAfecta * primaSeguro);
    resultado.afpSeguro = resultado.afpPrima;
    resultado.afpComision = round2(remuneracionAfecta * comisionFlujo);
  } else if (regimen.tipo === 'ONP') {
    const aporteOnp = safeNumber(regimen.aporte_obligatorio) / 100;
    resultado.onp = round2(remuneracionAfecta * (aporteOnp || ONP_PORCENTAJE));
  }

  return resultado;
}
