/**
 * Pure domain types for the régimen-parameterized payroll engine.
 *
 * Dependency Rule: this file imports NOTHING from `@prisma/client`, NestJS,
 * or `planillas.config`. Domain code only ever sees these plain shapes.
 * Naming en español (dominio). `regimen_laboral` (labor régimen) is an axis
 * orthogonal to `sistema_pensionario` (AFP/ONP) — do not conflate them.
 */

/** Labor régimen (NOT the pension system). Drives benefit strategy selection. */
export enum RegimenLaboral {
  GENERAL = 'GENERAL',
  PEQUENA_EMPRESA = 'PEQUENA_EMPRESA',
  MICROEMPRESA = 'MICROEMPRESA',
  AGRARIO = 'AGRARIO',
  CONSTRUCCION_CIVIL = 'CONSTRUCCION_CIVIL',
  HOGAR = 'HOGAR',
}

/** Tamaño de empresa (régimen agrario): define la tasa EsSalud por gradualidad. */
export enum TamanoEmpresa {
  GRANDE = 'GRANDE',
  PEQUENA = 'PEQUENA',
}

/** Categoría de obrero en construcción civil. Define jornal básico y BUC. */
export enum CategoriaConstruccion {
  OPERARIO = 'OPERARIO',
  OFICIAL = 'OFICIAL',
  PEON = 'PEON',
}

/** Pension system the worker is affiliated to. Orthogonal to RegimenLaboral. */
export enum SistemaPensionario {
  AFP = 'AFP',
  ONP = 'ONP',
}

/** AFP rates (already as fractions, e.g. 0.10 for 10%). */
export interface TasasAfp {
  aporteObligatorio: number;
  primaSeguro: number;
  comisionFlujo: number;
}

/** Plain affiliation shape consumed by the sistema-pensionario concept. */
export interface AfiliacionPensionaria {
  sistema: SistemaPensionario;
  /** Required for AFP; ignored for ONP. */
  tasas?: TasasAfp;
}

/** One progressive bracket of IR 5ta categoría. Limits expressed in UITs. */
export interface TramoIR {
  /** Upper bound of the bracket in UITs (`Infinity` for the top bracket). */
  hasta: number;
  /** Marginal rate as a fraction (e.g. 0.08 for 8%). */
  tasa: number;
}

/** Classification of a boleta line. */
export type TipoConcepto = 'ingreso' | 'descuento' | 'aporte';

/** A single, already-computed payroll line. */
export interface ConceptoBoleta {
  clave: string;
  descripcion: string;
  tipo: TipoConcepto;
  monto: number;
}

/** Output of a single concept calculator (zero, one or many lines). */
export interface ResultadoConcepto {
  conceptos: ConceptoBoleta[];
}

/** Daily tareo entry, plain (no Prisma types). */
export interface DetalleTareo {
  fecha: Date;
  horasTrabajadas: number;
  horasExtras: number;
  esNocturno: boolean;
  esFeriado: boolean;
  asistio: boolean;
}

/** Aggregated tareo result produced by `parsear-tareo`. */
export interface ResumenTareo {
  diasTrabajados: number;
  horasNormales: number;
  horasExtras25: number;
  horasExtras35: number;
  horasExtrasNocturnas25: number;
  horasExtrasNocturnas35: number;
  diasNocturnos: number;
}

/** Plain calculation input mapped from Prisma at the aplicación edge. */
export interface EntradaCalculo {
  regimenLaboral: RegimenLaboral;
  remuneracionBasica: number;
  tieneHijos: boolean;
  afiliacion: AfiliacionPensionaria | null;
  periodo: PeriodoCalculo;
  tareo: DetalleTareo[];
  /**
   * Period-derived benefit inputs resolved at the aplicación edge (meses/días
   * del semestre, 1/6 grati, días de vacaciones gozados). Cuando se omiten, el
   * orquestador asume semestre completo (mesesGratificacion=6, mesesCts=6) y
   * deriva el 1/6 de la gratificación de la remuneración computable.
   */
  devengados?: Partial<DatosDevengados>;
  /**
   * Acumulados de renta para la retención de IR 5ta (meses previos del año).
   * Se omiten → 0 (primer mes / sin acumulados).
   */
  acumuladoRenta?: number;
  retencionesPreviasRenta?: number;
  /**
   * Régimen AGRARIO: selecciona el sistema de prorrateo (Ley 31110) en el que
   * grati/CTS se incorporan al jornal diario. Se propaga al `ContextoCalculo`.
   * Omitido/false → sistema separado. Ignorado por el resto de régimenes.
   */
  usaProrrateoAgrario?: boolean;
}

/** Período of the planilla. `fecha` resolves date-versioned legal params. */
export interface PeriodoCalculo {
  anio: number;
  mes: number;
  /** Reference date used to resolve ParametrosLegales (e.g. last day of mes). */
  fecha: Date;
}

/**
 * Period-derived benefit inputs that depend on Prisma dates/promedios and are
 * resolved at the aplicación edge (NOT inside the pure domain). The orchestrator
 * receives them already computed so régimen strategies stay pure.
 */
export interface DatosDevengados {
  /** Meses completos trabajados en el semestre (gratificación). */
  mesesGratificacion: number;
  /** Meses completos del semestre para CTS. */
  mesesCts: number;
  /** Días sueltos del semestre para CTS. */
  diasCts: number;
  /** 1/6 de la última gratificación, base computable de CTS. */
  sextoGratificacion: number;
  /** Días de vacaciones efectivamente gozados en el período. */
  diasVacaciones: number;
}

/** Context passed to régimen-varying calculators (derived from EntradaCalculo). */
export interface ContextoCalculo {
  regimenLaboral: RegimenLaboral;
  /** Remuneración base mensual (sueldo proporcional a días trabajados). */
  remuneracionMensual: number;
  /** Remuneración afecta del mes (base de pensión y EsSalud). */
  remuneracionAfecta: number;
  /** Base computable de beneficios sociales (sueldo + promedios). */
  remuneracionComputable: number;
  tieneHijos: boolean;
  periodo: PeriodoCalculo;
  resumenTareo: ResumenTareo;
  devengados: DatosDevengados;
  /**
   * Categoría de construcción civil (solo CONSTRUCCION_CIVIL). Resuelve jornal y
   * BUC desde ParametrosLegales. Omitida en el resto de régimenes.
   */
  categoriaConstruccion?: CategoriaConstruccion;
  /**
   * Tamaño de empresa (solo AGRARIO): elige la tasa EsSalud por gradualidad
   * (GRANDE 9% / PEQUEÑA 6% en 2026). Omitido en el resto de régimenes.
   */
  tamanoEmpresa?: TamanoEmpresa;
  /**
   * Régimen AGRARIO: si true, grati/CTS/vacaciones se prorratean dentro del
   * jornal diario (sistema de prorrateo Ley 31110). Si false/omitido, se pagan
   * por separado igual que el GENERAL.
   */
  usaProrrateoAgrario?: boolean;
}

/** Final boleta produced by the orchestrator. */
export interface ResultadoBoleta {
  conceptos: ConceptoBoleta[];
  totalIngresos: number;
  totalDescuentos: number;
  totalAportes: number;
  neto: number;
}
