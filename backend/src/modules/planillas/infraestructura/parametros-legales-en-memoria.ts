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
  ParametrosAgrario,
  ParametrosConstruccionCivil,
  ParametroLegalNoVigenteError,
} from '../dominio/parametros/parametros-legales';
import { CategoriaConstruccion, TramoIR } from '../dominio/tipos';
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
  sisMicroempresa?: ValorVigente<number>[];
  tramosIR?: ValorVigente<TramoIR[]>[];
  sctrSalud?: ValorVigente<number>[];
  sctrPension?: ValorVigente<number>[];
  /** Tabla agraria (Ley 31110) versionada por vigencia anual. */
  agrario?: ValorVigente<ParametrosAgrario>[];
  /** Tabla construcción civil versionada por vigencia, una serie por categoría. */
  construccionCivil?: Record<
    CategoriaConstruccion,
    ValorVigente<ParametrosConstruccionCivil>[]
  >;
}

/**
 * Aporte SIS semicontributivo (microempresa REMYPE), monto fijo mensual del
 * empleador. Placeholder.
 * [ASUNCIÓN A VALIDAR: monto oficial SIS microempresa].
 */
const SIS_MICROEMPRESA = 15;

/** Vigencia que arranca en la fecha de la RMV 2025 (placeholder histórico). */
const VIGENCIA_BASE = new Date('2025-01-01');

/** Vigencia de la convención colectiva CC 2026 (R.M. 197-2025-TR). */
const VIGENCIA_CC_2026_DESDE = new Date('2026-01-01');
const VIGENCIA_CC_2026_HASTA = new Date('2026-12-31');

/**
 * Tabla AGRARIO 2026 (Ley 31110). Los valores ✅ CONFIRMADOS son ley dura.
 * `diasVacaciones` es ⚠️ NO CONFIRMADO (15 vs 30) — placeholder a corregir por el
 * contador SIN tocar código (es un dato versionado).
 */
const AGRARIO_2026: ParametrosAgrario = {
  remMinimaDiaria: 47.61, // ✅ CONFIRMADO 2026
  rmvReferencia: 1130,
  essaludTasaGrande: 0.09, // ✅ CONFIRMADO (gradualidad: 9% desde 2025)
  essaludTasaPequena: 0.06, // ✅ CONFIRMADO (6% hasta 2027)
  gratiPctRb: 0.1666, // ✅ CONFIRMADO
  ctsPctRb: 0.0972, // ✅ CONFIRMADO
  diasVacaciones: 30, // ⚠️ NO CONFIRMADO: 15 vs 30. Placeholder.
};

/**
 * Tabla CONSTRUCCIÓN CIVIL 2026 (R.M. 197-2025-TR) por categoría. Jornales y BUC
 * ✅ CONFIRMADOS. `movilidadDiaria`, `baeMonto` y `diasMinimosGrati` son
 * ⚠️ NO CONFIRMADOS — placeholders a corregir por el contador como DATO.
 */
function ccCategoria(
  jornalBasicoDiario: number,
  bucPorcentaje: number,
): ParametrosConstruccionCivil {
  return {
    jornalBasicoDiario, // ✅ CONFIRMADO por categoría
    bucPorcentaje, // ✅ CONFIRMADO (operario 0.32; oficial/peón 0.30)
    gratiJornales: 40, // ✅ CONFIRMADO (40 FP + 40 Navidad)
    ctsPorcentaje: 0.15, // ✅ CONFIRMADO
    conafovicerPorcentaje: 0.02, // ✅ CONFIRMADO (descuento al trabajador)
    fondoCapacitacionPorcentaje: 0.0045, // ✅ CONFIRMADO (desde 01-01-2026)
    movilidadDiaria: 0, // ⚠️ NO CONFIRMADO. Placeholder.
    baeMonto: 0, // ⚠️ NO CONFIRMADO (monto BAE 2026). Placeholder.
    diasMinimosGrati: 0, // ⚠️ NO CONFIRMADO (requisito antigüedad). Placeholder.
  };
}

const CC_2026: Record<
  CategoriaConstruccion,
  ValorVigente<ParametrosConstruccionCivil>[]
> = {
  [CategoriaConstruccion.OPERARIO]: [
    {
      valor: ccCategoria(89.3, 0.32),
      vigenciaDesde: VIGENCIA_CC_2026_DESDE,
      vigenciaHasta: VIGENCIA_CC_2026_HASTA,
    },
  ],
  [CategoriaConstruccion.OFICIAL]: [
    {
      valor: ccCategoria(69.75, 0.3),
      vigenciaDesde: VIGENCIA_CC_2026_DESDE,
      vigenciaHasta: VIGENCIA_CC_2026_HASTA,
    },
  ],
  [CategoriaConstruccion.PEON]: [
    {
      valor: ccCategoria(62.8, 0.3),
      vigenciaDesde: VIGENCIA_CC_2026_DESDE,
      vigenciaHasta: VIGENCIA_CC_2026_HASTA,
    },
  ],
};

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
    sisMicroempresa: uno(SIS_MICROEMPRESA),
    tramosIR: uno(TRAMOS_IR_5TA as TramoIR[]),
    sctrSalud: uno(SCTR_SALUD_TASA),
    sctrPension: uno(SCTR_PENSION_TASA),
    agrario: [
      {
        valor: AGRARIO_2026,
        vigenciaDesde: VIGENCIA_CC_2026_DESDE,
        vigenciaHasta: VIGENCIA_CC_2026_HASTA,
      },
    ],
    construccionCivil: CC_2026,
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
  sisMicroempresa(fecha: Date): number {
    return this.resolver(
      'sisMicroempresa',
      this.semilla.sisMicroempresa,
      fecha,
    );
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
  agrario(fecha: Date): ParametrosAgrario {
    return this.resolver('agrario', this.semilla.agrario, fecha);
  }
  construccionCivil(
    fecha: Date,
    categoria: CategoriaConstruccion,
  ): ParametrosConstruccionCivil {
    const serie = this.semilla.construccionCivil?.[categoria];
    return this.resolver(`construccionCivil:${categoria}`, serie, fecha);
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
