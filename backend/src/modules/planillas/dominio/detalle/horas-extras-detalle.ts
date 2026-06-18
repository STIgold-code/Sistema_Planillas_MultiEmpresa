/**
 * Montos de horas extras (D.S. 007-2002-TR) como función PURA del dominio.
 * Reproduce al céntimo `calculos/horas-extras.ts` del legacy. La sobretasa
 * nocturna proviene del puerto.
 */
import { redondear2 } from './redondeo';
import { ClasificacionTareo } from './clasificar-dias-tareo';

export interface MontosHorasExtras {
  horasExtras25: number;
  horasExtras35: number;
  horasExtras: number;
}

export function calcularHorasExtrasDetalle(
  sueldoBase: number,
  c: ClasificacionTareo,
  sobretasaNocturna: number,
): MontosHorasExtras {
  const valorHoraNormal = redondear2(sueldoBase / 30 / 8);
  const v25 = redondear2(valorHoraNormal * 1.25);
  const v35 = redondear2(valorHoraNormal * 1.35);
  const vNoct25 = redondear2(valorHoraNormal * (1 + sobretasaNocturna) * 1.25);
  const vNoct35 = redondear2(valorHoraNormal * (1 + sobretasaNocturna) * 1.35);

  const diurnas25 = redondear2(c.totalHorasExtrasDiurnas25 * v25);
  const diurnas35 = redondear2(c.totalHorasExtrasDiurnas35 * v35);
  const nocturnas25 = redondear2(c.totalHorasExtrasNocturnas25 * vNoct25);
  const nocturnas35 = redondear2(c.totalHorasExtrasNocturnas35 * vNoct35);

  const horasExtras25 = redondear2(diurnas25 + nocturnas25);
  const horasExtras35 = redondear2(diurnas35 + nocturnas35);
  return {
    horasExtras25,
    horasExtras35,
    horasExtras: redondear2(horasExtras25 + horasExtras35),
  };
}
