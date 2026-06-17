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
}

/** Período of the planilla. `fecha` resolves date-versioned legal params. */
export interface PeriodoCalculo {
  anio: number;
  mes: number;
  /** Reference date used to resolve ParametrosLegales (e.g. last day of mes). */
  fecha: Date;
}

/** Context passed to régimen-varying calculators (derived from EntradaCalculo). */
export interface ContextoCalculo {
  regimenLaboral: RegimenLaboral;
  remuneracionComputable: number;
  tieneHijos: boolean;
  periodo: PeriodoCalculo;
  resumenTareo: ResumenTareo;
}

/** Final boleta produced by the orchestrator. */
export interface ResultadoBoleta {
  conceptos: ConceptoBoleta[];
  totalIngresos: number;
  totalDescuentos: number;
  totalAportes: number;
  neto: number;
}
