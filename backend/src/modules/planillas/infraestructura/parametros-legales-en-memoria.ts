/**
 * In-memory adapter implementing the `ParametrosLegales` port.
 *
 * TEMPORARY: wraps the constants from `planillas.config.ts` behind the port so
 * the magic numbers leave the domain. It will be replaced by a
 * `ParametroLegal`-table-backed adapter once that schema lands (separate change).
 *
 * Layer: infraestructura (an adapter), NOT pure domain — hence it MAY import
 * `planillas.config`. The pure `dominio/` only ever sees the `ParametrosLegales`
 * interface (DIP).
 *
 * Resolution is date-versioned: each key holds one or more vigencia windows.
 * If no window covers the período date, it raises `ParametroLegalNoVigenteError`
 * (never silently returns 0).
 */
import {
  ParametrosLegales,
  ParametroLegalNoVigenteError,
} from '../dominio/parametros/parametros-legales';
import { TramoIR } from '../dominio/tipos';
import {
  RMV,
  UIT,
  ASIGNACION_FAMILIAR,
  ESSALUD_PORCENTAJE,
  ESSALUD_MINIMO,
  SCTR_SALUD_TASA,
  SCTR_PENSION_TASA,
  TRAMOS_IR_5TA,
} from '../planillas.config';

/** A single date-versioned value. */
export interface ValorVigente<T> {
  valor: T;
  vigenciaDesde: Date;
  /** Open-ended when omitted. */
  vigenciaHasta?: Date;
}

/** Seed of versioned values per legal key. */
export interface SemillaParametros {
  rmv?: ValorVigente<number>[];
  uit?: ValorVigente<number>[];
  asignacionFamiliar?: ValorVigente<number>[];
  essaludTasa?: ValorVigente<number>[];
  essaludMinimo?: ValorVigente<number>[];
  tramosIR?: ValorVigente<TramoIR[]>[];
  sctrSalud?: ValorVigente<number>[];
  sctrPension?: ValorVigente<number>[];
}

/** Vigencia que arranca en la fecha de la RMV 2025 (placeholder histórico). */
const VIGENCIA_BASE = new Date('2025-01-01');

const uno = <T>(valor: T): ValorVigente<T>[] => [
  { valor, vigenciaDesde: VIGENCIA_BASE },
];

/** Default seed sourced from `planillas.config.ts`. */
function semillaPorDefecto(): Required<SemillaParametros> {
  return {
    rmv: uno(RMV),
    uit: uno(UIT),
    asignacionFamiliar: uno(ASIGNACION_FAMILIAR),
    essaludTasa: uno(ESSALUD_PORCENTAJE),
    essaludMinimo: uno(ESSALUD_MINIMO),
    tramosIR: uno(TRAMOS_IR_5TA as TramoIR[]),
    sctrSalud: uno(SCTR_SALUD_TASA),
    sctrPension: uno(SCTR_PENSION_TASA),
  };
}

export class ParametrosLegalesEnMemoria implements ParametrosLegales {
  private readonly semilla: SemillaParametros;

  constructor(semilla?: SemillaParametros) {
    this.semilla = semilla ?? semillaPorDefecto();
  }

  rmv(fecha: Date): number {
    return this.resolver('rmv', this.semilla.rmv, fecha);
  }
  uit(fecha: Date): number {
    return this.resolver('uit', this.semilla.uit, fecha);
  }
  asignacionFamiliar(fecha: Date): number {
    return this.resolver(
      'asignacionFamiliar',
      this.semilla.asignacionFamiliar,
      fecha,
    );
  }
  essaludTasa(fecha: Date): number {
    return this.resolver('essaludTasa', this.semilla.essaludTasa, fecha);
  }
  essaludMinimo(fecha: Date): number {
    return this.resolver('essaludMinimo', this.semilla.essaludMinimo, fecha);
  }
  tramosIR(fecha: Date): TramoIR[] {
    return this.resolver('tramosIR', this.semilla.tramosIR, fecha);
  }
  sctrSalud(fecha: Date): number {
    return this.resolver('sctrSalud', this.semilla.sctrSalud, fecha);
  }
  sctrPension(fecha: Date): number {
    return this.resolver('sctrPension', this.semilla.sctrPension, fecha);
  }

  private resolver<T>(
    clave: string,
    valores: ValorVigente<T>[] | undefined,
    fecha: Date,
  ): T {
    const vigente = (valores ?? []).find(
      (v) =>
        fecha >= v.vigenciaDesde &&
        (v.vigenciaHasta === undefined || fecha <= v.vigenciaHasta),
    );
    if (!vigente) throw new ParametroLegalNoVigenteError(clave, fecha);
    return vigente.valor;
  }
}
