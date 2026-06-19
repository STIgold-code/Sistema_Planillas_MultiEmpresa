/**
 * Concepto: horas-extras (D.S. 007-2002-TR). Pure refactor of
 * `calculos/horas-extras.ts` into the domain.
 *
 * - Jornada máxima legal: 8 horas diarias.
 * - HE 25%: primeras 2 horas extras del día.
 * - HE 35%: desde la 3ra hora extra.
 * - HE nocturnas: combinan sobretasa nocturna (35%) + sobretasa HE.
 *
 * Régimen-agnostic: depende solo del sueldo base y del resumen de tareo.
 */
import { ConceptoBoleta, ResultadoConcepto, ResumenTareo } from '../tipos';

export const CLAVE_HE_25 = 'horas_extras_25';
export const CLAVE_HE_35 = 'horas_extras_35';

/** Sobretasa por trabajo nocturno (10pm-6am) - D.S. 007-2002-TR. */
const SOBRETASA_NOCTURNA = 0.35;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

const ingreso = (clave: string, descripcion: string, monto: number) => ({
  clave,
  descripcion,
  tipo: 'ingreso' as const,
  monto: redondear2(monto),
});

export function calcularHorasExtras(
  sueldoBase: number,
  resumen: ResumenTareo,
): ResultadoConcepto {
  const valorHora = redondear2(sueldoBase / 30 / 8);

  const valor25 = redondear2(valorHora * 1.25);
  const valor35 = redondear2(valorHora * 1.35);
  const valorNocturno25 = redondear2(
    valorHora * (1 + SOBRETASA_NOCTURNA) * 1.25,
  );
  const valorNocturno35 = redondear2(
    valorHora * (1 + SOBRETASA_NOCTURNA) * 1.35,
  );

  const monto25 = redondear2(
    resumen.horasExtras25 * valor25 +
      resumen.horasExtrasNocturnas25 * valorNocturno25,
  );
  const monto35 = redondear2(
    resumen.horasExtras35 * valor35 +
      resumen.horasExtrasNocturnas35 * valorNocturno35,
  );

  const conceptos: ConceptoBoleta[] = [];
  if (monto25 > 0)
    conceptos.push(ingreso(CLAVE_HE_25, 'Horas extras 25%', monto25));
  if (monto35 > 0)
    conceptos.push(ingreso(CLAVE_HE_35, 'Horas extras 35%', monto35));

  return { conceptos };
}
