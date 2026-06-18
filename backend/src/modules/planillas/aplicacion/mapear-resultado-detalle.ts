/**
 * Mapper inverso: dominio `ResultadoBoleta` → subset de `PlanillaDetalle`.
 *
 * Extrae del resultado del motor nuevo los MONTOS load-bearing que el camino real
 * enruta por el motor (haber mensual, horas extras, jornada nocturna,
 * gratificación, bonificación 30334, CTS, EsSalud empleador, pensión AFP/ONP y
 * renta 5ta), keyados por el nombre de campo del DTO Prisma `PlanillaDetalle`.
 *
 * Estos montos son la FUENTE DE VERDAD del motor. El resto de campos del DTO
 * (~110: estructura salarial, días detallados, vida ley, SCTR empleador,
 * remuneraciones computables, beneficios truncos) NO los modela el motor todavía
 * y se completan en el borde de aplicación a partir del paso auxiliar legacy.
 *
 * Borde de aplicación: traduce claves de dominio (español, ConceptoBoleta) a
 * nombres de campo Prisma. El dominio no conoce el DTO.
 */
import { ResultadoBoleta } from '../dominio/tipos';
import { CLAVE_HE_25, CLAVE_HE_35 } from '../dominio/conceptos/horas-extras';
import { CLAVE_BONIF_NOCTURNA } from '../dominio/conceptos/jornada-nocturna';
import { CLAVE_GRATIFICACION } from '../dominio/conceptos/gratificacion';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../dominio/conceptos/bonificacion-extraordinaria';
import { CLAVE_CTS } from '../dominio/conceptos/cts';
import { CLAVE_ESSALUD } from '../dominio/conceptos/salud-empleador';
import {
  CLAVE_ONP,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
} from '../dominio/conceptos/sistema-pensionario';
import { CLAVE_RENTA_5TA } from '../dominio/conceptos/renta-quinta';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

/** Subset load-bearing del DTO `PlanillaDetalle` que el motor produce. */
export interface MontosLoadBearing {
  haber_mensual: number;
  horas_extras_25: number;
  horas_extras_35: number;
  horas_extras: number;
  bonificacion_nocturna: number;
  sueldo_nocturno: number;
  gratificacion_monto: number;
  bonif_extraordinaria: number;
  cts_monto: number;
  essalud_empleador: number;
  afp_aporte: number;
  afp_prima: number;
  afp_seguro: number;
  afp_comision: number;
  onp: number;
  renta_5ta: number;
}

/** Suma los montos de todos los conceptos con la `clave` dada. */
function monto(boleta: ResultadoBoleta, clave: string): number {
  return redondear2(
    boleta.conceptos
      .filter((c) => c.clave === clave)
      .reduce((acc, c) => acc + c.monto, 0),
  );
}

export function extraerMontosLoadBearing(
  boleta: ResultadoBoleta,
): MontosLoadBearing {
  const he25 = monto(boleta, CLAVE_HE_25);
  const he35 = monto(boleta, CLAVE_HE_35);
  const nocturna = monto(boleta, CLAVE_BONIF_NOCTURNA);
  const afpPrima = monto(boleta, CLAVE_AFP_PRIMA);

  return {
    haber_mensual: monto(boleta, 'haber_mensual'),
    horas_extras_25: he25,
    horas_extras_35: he35,
    horas_extras: redondear2(he25 + he35),
    bonificacion_nocturna: nocturna,
    sueldo_nocturno: nocturna,
    gratificacion_monto: monto(boleta, CLAVE_GRATIFICACION),
    bonif_extraordinaria: monto(boleta, CLAVE_BONIF_EXTRAORDINARIA),
    cts_monto: monto(boleta, CLAVE_CTS),
    essalud_empleador: monto(boleta, CLAVE_ESSALUD),
    afp_aporte: monto(boleta, CLAVE_AFP_APORTE),
    afp_prima: afpPrima,
    // El legacy expone afp_seguro como espejo de afp_prima (misma prima).
    afp_seguro: afpPrima,
    afp_comision: monto(boleta, CLAVE_AFP_COMISION),
    onp: monto(boleta, CLAVE_ONP),
    renta_5ta: monto(boleta, CLAVE_RENTA_5TA),
  };
}
