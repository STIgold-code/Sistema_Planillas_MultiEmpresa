/**
 * Clasificador puro de días del tareo por nomenclatura (códigos de marcación).
 *
 * Reproduce EXACTAMENTE el bucle de clasificación del motor legacy
 * `calcular-empleado.ts`: cuenta días por código (F, S, V, SI, SM, DM, LSG, LF,
 * LP, LCG, DT, E, FJ, P, PG, RET, T, H, DL, N, SC), feriados trabajados, turnos
 * día/noche, días con jornada de 8h y el desglose de horas extras 25%/35%
 * diurnas y nocturnas (D.S. 007-2002-TR).
 *
 * Dependency Rule: recibe un shape plano (`DiaTareoDetalle[]`), sin Prisma.
 */
import { DiaTareoDetalle } from './tipos-detalle';

const JORNADA_MAXIMA = 8;
const HE_TRAMO_25 = 2;

/**
 * Códigos que NO cuentan como día laborable aunque la nomenclatura los marque
 * `es_laborable=true`. Idéntico a `CODIGOS_NO_LABORABLES` del legacy.
 */
const CODIGOS_NO_LABORABLES = new Set([
  'DL',
  'N',
  'SC',
  'Q',
  'DM',
  'SI',
  'S-ENF',
  'SM',
  'S-MAT',
  'VAC',
  'V',
  'H',
]);

/** Resultado de clasificar todos los días del tareo. */
export interface ClasificacionTareo {
  diasFalta: number;
  diasSuspension: number;
  diasVacaciones: number;
  diasSubsidioIncapacidad: number;
  diasSubsidioMaternidad: number;
  diasDescansoMedico: number;
  diasLicenciaSinGoce: number;
  diasLicenciaFallecimiento: number;
  diasLicenciaPaternidad: number;
  diasLicenciaConGoce: number;
  turnoDia: number;
  turnoNoche: number;
  horas8: number;
  cantidadFeriados: number;
  diasDescansoTrabajado: number;
  diasHorasExtra: number;
  diasFaltaJustificada: number;
  diasPermiso: number;
  diasPegada: number;
  diasRetenido: number;
  minutosTardanza: number;
  diasFeriadoNoTrabajado: number;
  tieneAdelantoQuincenal: boolean;
  diasLaborables: number;
  totalHorasExtrasDiurnas25: number;
  totalHorasExtrasDiurnas35: number;
  totalHorasExtrasNocturnas25: number;
  totalHorasExtrasNocturnas35: number;
}

function clasificacionVacia(): ClasificacionTareo {
  return {
    diasFalta: 0,
    diasSuspension: 0,
    diasVacaciones: 0,
    diasSubsidioIncapacidad: 0,
    diasSubsidioMaternidad: 0,
    diasDescansoMedico: 0,
    diasLicenciaSinGoce: 0,
    diasLicenciaFallecimiento: 0,
    diasLicenciaPaternidad: 0,
    diasLicenciaConGoce: 0,
    turnoDia: 0,
    turnoNoche: 0,
    horas8: 0,
    cantidadFeriados: 0,
    diasDescansoTrabajado: 0,
    diasHorasExtra: 0,
    diasFaltaJustificada: 0,
    diasPermiso: 0,
    diasPegada: 0,
    diasRetenido: 0,
    minutosTardanza: 0,
    diasFeriadoNoTrabajado: 0,
    tieneAdelantoQuincenal: false,
    diasLaborables: 0,
    totalHorasExtrasDiurnas25: 0,
    totalHorasExtrasDiurnas35: 0,
    totalHorasExtrasNocturnas25: 0,
    totalHorasExtrasNocturnas35: 0,
  };
}

/** Cuenta el día según su código de nomenclatura (mutación in-place). */
function contarPorCodigo(c: ClasificacionTareo, dia: DiaTareoDetalle): void {
  const codigo = dia.codigo;
  if (codigo === 'F') c.diasFalta++;
  else if (codigo === 'S' || codigo === 'SUS') c.diasSuspension++;
  else if (codigo === 'V' || codigo === 'VAC') c.diasVacaciones++;
  else if (codigo === 'SI' || codigo === 'S-ENF') c.diasSubsidioIncapacidad++;
  else if (codigo === 'SM' || codigo === 'S-MAT') c.diasSubsidioMaternidad++;
  else if (codigo === 'DM') c.diasDescansoMedico++;
  else if (codigo === 'LSG') c.diasLicenciaSinGoce++;
  else if (codigo === 'LF' || codigo === 'LIC-F') c.diasLicenciaFallecimiento++;
  else if (codigo === 'LP' || codigo === 'LIC-P') c.diasLicenciaPaternidad++;
  else if (codigo === 'LCG' || codigo === 'LIC-G') c.diasLicenciaConGoce++;
  else if (codigo === 'DT') c.diasDescansoTrabajado++;
  else if (codigo === 'E') c.diasHorasExtra++;
  else if (codigo === 'FJ') c.diasFaltaJustificada++;
  else if (codigo === 'P') c.diasPermiso++;
  else if (codigo === 'PG') c.diasPegada++;
  else if (codigo === 'RET') c.diasRetenido++;
  else if (codigo === 'Q') c.tieneAdelantoQuincenal = true;
  else if (codigo === 'T') c.minutosTardanza += dia.horasDetalle * 60;
  else if (codigo === 'H') c.diasFeriadoNoTrabajado++;
}

/** Resuelve las horas del día: detalle > nomenclatura > default (= legacy). */
function resolverHorasDia(dia: DiaTareoDetalle): number {
  if (dia.horasDetalle > 0) return dia.horasDetalle;
  const nomenclatura = dia.horasDiurnas + dia.horasNocturnas;
  if (nomenclatura > 0) return nomenclatura;
  return dia.horasDefault ?? JORNADA_MAXIMA;
}

/** Acumula horas extras y turnos para un día laborable (mutación in-place). */
function acumularJornada(c: ClasificacionTareo, dia: DiaTareoDetalle): void {
  const horasDia = resolverHorasDia(dia);
  const esNocturna = dia.horasNocturnas > 0;

  if (horasDia === JORNADA_MAXIMA) {
    c.horas8++;
  } else if (horasDia > JORNADA_MAXIMA) {
    const extras = horasDia - JORNADA_MAXIMA;
    const he25 = Math.min(HE_TRAMO_25, extras);
    const he35 = Math.max(0, extras - HE_TRAMO_25);
    if (esNocturna) {
      c.totalHorasExtrasNocturnas25 += he25;
      c.totalHorasExtrasNocturnas35 += he35;
    } else {
      c.totalHorasExtrasDiurnas25 += he25;
      c.totalHorasExtrasDiurnas35 += he35;
    }
  }

  if (dia.horasNocturnas > 0) c.turnoNoche++;
  else if (dia.horasDiurnas > 0) c.turnoDia++;
}

/** Clasifica todos los días del tareo replicando el legacy al detalle. */
export function clasificarDiasTareo(
  dias: DiaTareoDetalle[],
): ClasificacionTareo {
  const c = clasificacionVacia();

  for (const dia of dias) {
    if (!dia.codigo) continue;
    contarPorCodigo(c, dia);
    if (dia.esFeriadoTrabajado) c.cantidadFeriados++;

    const esNoLaborable = CODIGOS_NO_LABORABLES.has(dia.codigo);
    if (dia.esLaborable && !esNoLaborable) {
      c.diasLaborables++;
      acumularJornada(c, dia);
    }
  }

  return c;
}
