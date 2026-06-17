/**
 * ParametrosLegales — the ONLY seam through which the pure domain reads
 * date-versioned legal parameters (RMV, UIT, EsSalud, IR brackets, SCTR...).
 *
 * Every monetary factor in the domain MUST resolve through this port so there
 * are zero magic numbers inside `dominio/`. Implementations resolve each value
 * by the planilla período `fecha` (vigencia window). When no vigente value
 * exists for a key+fecha, the implementation MUST raise `ParametroLegalNoVigenteError`
 * (never silently default to 0).
 */
import { TramoIR } from '../tipos';

export interface ParametrosLegales {
  /** Remuneración Mínima Vital vigente en `fecha`. */
  rmv(fecha: Date): number;
  /** Unidad Impositiva Tributaria vigente en `fecha`. */
  uit(fecha: Date): number;
  /** Asignación familiar (monto plano) vigente en `fecha`. */
  asignacionFamiliar(fecha: Date): number;
  /** Tasa EsSalud del empleador (fracción) vigente en `fecha`. */
  essaludTasa(fecha: Date): number;
  /** Piso EsSalud (9% de RMV) vigente en `fecha`. */
  essaludMinimo(fecha: Date): number;
  /** Tramos progresivos de IR 5ta categoría vigentes en `fecha`. */
  tramosIR(fecha: Date): TramoIR[];
  /** Tasa SCTR Salud (fracción) vigente en `fecha`. */
  sctrSalud(fecha: Date): number;
  /** Tasa SCTR Pensión (fracción) vigente en `fecha`. */
  sctrPension(fecha: Date): number;
}

/** Raised when no ParametroLegal covers the período date for a key. */
export class ParametroLegalNoVigenteError extends Error {
  constructor(
    public readonly clave: string,
    public readonly fecha: Date,
  ) {
    super(
      `No existe valor vigente para "${clave}" en ${fecha
        .toISOString()
        .slice(0, 10)}`,
    );
    this.name = 'ParametroLegalNoVigenteError';
  }
}
