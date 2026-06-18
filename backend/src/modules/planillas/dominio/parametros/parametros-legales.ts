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
import { CategoriaConstruccion, TramoIR } from '../tipos';

/**
 * Parámetros del régimen AGRARIO (Ley 31110) versionados por año.
 * Estructura definida por el experto SUNAT (tabla_agrario). El valor es un DATO
 * (parámetro legal versionado), de modo que la confirmación del contador sobre
 * los puntos ⚠️ NO CONFIRMADOS sea un cambio de dato, no de código.
 */
export interface ParametrosAgrario {
  /** Remuneración Mínima Diaria agraria (jornal mínimo, >4h/día). ✅ CONFIRMADO 2026 = 47.61. */
  remMinimaDiaria: number;
  /** RMV de referencia (la RB no puede ser < RMV). */
  rmvReferencia: number;
  /** Tasa EsSalud empleador para empresa GRANDE (>=100 trab. o ventas >1700 UIT). 2026 = 0.09. */
  essaludTasaGrande: number;
  /** Tasa EsSalud empleador para empresa PEQUEÑA. 2026 = 0.06. */
  essaludTasaPequena: number;
  /** Gratificación como proporción de la RB (mensual). ✅ CONFIRMADO = 0.1666. */
  gratiPctRb: number;
  /** CTS como proporción de la RB (mensual). ✅ CONFIRMADO = 0.0972. */
  ctsPctRb: number;
  /**
   * Días de descanso vacacional anual.
   * ⚠️ NO CONFIRMADO: 15 vs 30 días (requiere lectura literal Ley 31110).
   * Validar con contador antes de correr planilla real.
   */
  diasVacaciones: number;
}

/**
 * Parámetros del régimen CONSTRUCCIÓN CIVIL (R.M. anual CAPECO-FTCCP)
 * versionados por vigencia + categoría. Estructura definida por el experto SUNAT
 * (tabla_construccion_civil). Cambia cada año por negociación colectiva → NUNCA
 * hardcodear; la confirmación del contador es un cambio de dato.
 */
export interface ParametrosConstruccionCivil {
  /** Jornal básico diario por categoría. ✅ CONFIRMADO 2026: operario 89.30, oficial 69.75, peón 62.80. */
  jornalBasicoDiario: number;
  /** Bonificación Unificada de Construcción (% del básico). ✅ operario 0.32, oficial/peón 0.30. */
  bucPorcentaje: number;
  /** Gratificación en N° de jornales básicos por fiesta. ✅ CONFIRMADO = 40 (FP) + 40 (Navidad). */
  gratiJornales: number;
  /** CTS como % del total de jornales básicos. ✅ CONFIRMADO = 0.15. */
  ctsPorcentaje: number;
  /** CONAFOVICER (% que se DESCUENTA al trabajador). ✅ CONFIRMADO = 0.02. */
  conafovicerPorcentaje: number;
  /** Aporte Fondo de Capacitación del empleador (% del jornal básico). ✅ = 0.0045. */
  fondoCapacitacionPorcentaje: number;
  /**
   * Movilidad diaria.
   * ⚠️ NO CONFIRMADO: monto/condiciones (validar R.M. literal).
   */
  movilidadDiaria: number;
  /**
   * Bonificación por Alta Especialización (BAE).
   * ⚠️ NO CONFIRMADO: monto exacto 2026.
   */
  baeMonto: number;
  /**
   * Días mínimos de obra para tener derecho a gratificación.
   * ⚠️ NO CONFIRMADO: requisito de antigüedad mínima (validar R.M.).
   */
  diasMinimosGrati: number;
}

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
  /**
   * Aporte SIS semicontributivo (monto fijo mensual del empleador) para
   * microempresa REMYPE, vigente en `fecha`.
   * [ASUNCIÓN A VALIDAR: monto SIS microempresa y opción de afiliación a EsSalud].
   */
  sisMicroempresa(fecha: Date): number;
  /** Tramos progresivos de IR 5ta categoría vigentes en `fecha`. */
  tramosIR(fecha: Date): TramoIR[];
  /** Tasa SCTR Salud (fracción) vigente en `fecha`. */
  sctrSalud(fecha: Date): number;
  /** Tasa SCTR Pensión (fracción) vigente en `fecha`. */
  sctrPension(fecha: Date): number;
  /** Parámetros del régimen agrario (Ley 31110) vigentes en `fecha`. */
  agrario(fecha: Date): ParametrosAgrario;
  /**
   * Parámetros de construcción civil vigentes en `fecha` para la `categoria`.
   * El jornal y la BUC dependen de la categoría (operario/oficial/peón).
   */
  construccionCivil(
    fecha: Date,
    categoria: CategoriaConstruccion,
  ): ParametrosConstruccionCivil;
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
