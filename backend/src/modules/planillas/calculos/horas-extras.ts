/**
 * Cálculo de horas extras según legislación peruana (D.S. 007-2002-TR)
 *
 * - Jornada máxima legal: 8 horas diarias
 * - HE 25%: primeras 2 horas extras (horas 9 y 10)
 * - HE 35%: desde la 3ra hora extra (hora 11 en adelante)
 * - HE nocturnas: combinan sobretasa nocturna (35%) + sobretasa HE
 */
import { round2, SOBRETASA_NOCTURNA } from '../planillas.config';

export interface AcumuladoHorasExtras {
  totalHorasExtrasDiurnas25: number;
  totalHorasExtrasDiurnas35: number;
  totalHorasExtrasNocturnas25: number;
  totalHorasExtrasNocturnas35: number;
}

export interface ResultadoHorasExtras {
  valorHoraNormal: number;
  valorHoraExtra25: number;
  valorHoraExtra35: number;
  horasExtrasDiurnas25: number;
  horasExtrasDiurnas35: number;
  horasExtrasNocturnas25: number;
  horasExtrasNocturnas35: number;
  horasExtras25: number;
  horasExtras35: number;
  horasExtras: number;
}

/**
 * Calcula los montos de horas extras a partir del sueldo base y las horas acumuladas del tareo.
 */
export function calcularHorasExtras(
  sueldoBase: number,
  acumulado: AcumuladoHorasExtras,
): ResultadoHorasExtras {
  const valorHoraNormal = round2(sueldoBase / 30 / 8);

  // Valores para HE diurnas
  const valorHoraExtra25 = round2(valorHoraNormal * 1.25);
  const valorHoraExtra35 = round2(valorHoraNormal * 1.35);

  // Valores para HE nocturnas (sobretasa combinada: nocturno × HE)
  const valorHoraExtraNocturna25 = round2(
    valorHoraNormal * (1 + SOBRETASA_NOCTURNA) * 1.25,
  );
  const valorHoraExtraNocturna35 = round2(
    valorHoraNormal * (1 + SOBRETASA_NOCTURNA) * 1.35,
  );

  // Montos
  const horasExtrasDiurnas25 = round2(
    acumulado.totalHorasExtrasDiurnas25 * valorHoraExtra25,
  );
  const horasExtrasDiurnas35 = round2(
    acumulado.totalHorasExtrasDiurnas35 * valorHoraExtra35,
  );
  const horasExtrasNocturnas25 = round2(
    acumulado.totalHorasExtrasNocturnas25 * valorHoraExtraNocturna25,
  );
  const horasExtrasNocturnas35 = round2(
    acumulado.totalHorasExtrasNocturnas35 * valorHoraExtraNocturna35,
  );

  const horasExtras25 = round2(horasExtrasDiurnas25 + horasExtrasNocturnas25);
  const horasExtras35 = round2(horasExtrasDiurnas35 + horasExtrasNocturnas35);
  const horasExtras = round2(horasExtras25 + horasExtras35);

  return {
    valorHoraNormal,
    valorHoraExtra25,
    valorHoraExtra35,
    horasExtrasDiurnas25,
    horasExtrasDiurnas35,
    horasExtrasNocturnas25,
    horasExtrasNocturnas35,
    horasExtras25,
    horasExtras35,
    horasExtras,
  };
}
