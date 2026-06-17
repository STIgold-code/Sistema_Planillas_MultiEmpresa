/**
 * Pure tareo parser: collapses a plain `DetalleTareo[]` into a `ResumenTareo`
 * (días trabajados, horas normales, desglose de HE 25/35 diurnas y nocturnas).
 *
 * Dependency Rule: takes a plain shape — the domain never sees Prisma types.
 * HE split rule (D.S. 007-2002-TR): las primeras 2 horas extras de cada día
 * pagan 25%; desde la 3ra, 35%.
 */
import { DetalleTareo, ResumenTareo } from '../tipos';

const HE_TRAMO_25_POR_DIA = 2;

export function parsearTareo(detalles: DetalleTareo[]): ResumenTareo {
  const resumen: ResumenTareo = {
    diasTrabajados: 0,
    horasNormales: 0,
    horasExtras25: 0,
    horasExtras35: 0,
    horasExtrasNocturnas25: 0,
    horasExtrasNocturnas35: 0,
    diasNocturnos: 0,
  };

  for (const dia of detalles) {
    if (!dia.asistio) continue;

    resumen.diasTrabajados += 1;
    resumen.horasNormales += dia.horasTrabajadas;
    if (dia.esNocturno) resumen.diasNocturnos += 1;

    const he25 = Math.min(dia.horasExtras, HE_TRAMO_25_POR_DIA);
    const he35 = Math.max(0, dia.horasExtras - HE_TRAMO_25_POR_DIA);

    if (dia.esNocturno) {
      resumen.horasExtrasNocturnas25 += he25;
      resumen.horasExtrasNocturnas35 += he35;
    } else {
      resumen.horasExtras25 += he25;
      resumen.horasExtras35 += he35;
    }
  }

  return resumen;
}
