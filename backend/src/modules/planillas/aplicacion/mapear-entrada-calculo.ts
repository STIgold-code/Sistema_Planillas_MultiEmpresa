/**
 * Mapper Prisma → dominio: construye el `EntradaCalculo` puro que consume el
 * orquestador `calcular-boleta` a partir de las filas Prisma del empleado, su
 * contrato del período y su tareo.
 *
 * Borde de aplicación (DIP): el dominio NUNCA importa Prisma. Toda la traducción
 * (Decimal→number, escala de tasas %→fracción, prioridad de horas del tareo,
 * detección de jornada nocturna, resolución de régimen laboral) vive aquí.
 *
 * Reglas de traducción que sostienen la PARIDAD con el motor legacy
 * (`calcular-empleado.ts`):
 *  - Horas del día: prioridad detalle.horas > (horas_diurnas + horas_nocturnas)
 *    de la nomenclatura > horas_default. Misma regla que el legacy.
 *  - Horas extras del día: max(0, horas - 8).
 *  - Jornada nocturna: la nomenclatura declara horas_nocturnas > 0.
 *  - Tasas pensionarias: el schema las guarda como porcentaje (10, 13, 1.74…);
 *    el dominio las espera como fracción → se dividen entre 100.
 *  - Asignación familiar (campo de dominio `tieneHijos`): se cablea desde el dato
 *    real `empleado.asignacion_familiar` (derecho del trabajador, 10% RMV por ley).
 *    Esto CORRIGE un subpago heredado del legacy, que la fijaba en 0 para todos.
 *    Es un cambio de comportamiento intencional respecto al legacy SOLO en este
 *    concepto; el resto de la paridad de montos se mantiene al céntimo.
 */
import {
  AfiliacionPensionaria,
  DetalleTareo,
  EntradaCalculo,
  SistemaPensionario,
} from '../dominio/tipos';
import {
  ContratoConRegimen,
  EmpresaConRegimenDefault,
  resolverRegimenLaboral,
} from './resolver-regimen-laboral';

/** Jornada legal máxima diaria (D.S. 007-2002-TR). */
const JORNADA_MAXIMA_DIARIA = 8;

/** Convierte Decimal/number/string de Prisma a número seguro. */
const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

/** Subset de la nomenclatura (tipo_marcacion) que el mapeo de tareo lee. */
export interface TipoMarcacionParaMapeo {
  es_laborable: boolean;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_default: number | null;
}

/** Subset del detalle de tareo que el mapeo lee. */
export interface DetalleTareoParaMapeo {
  horas: unknown;
  tipo_marcacion: TipoMarcacionParaMapeo | null;
}

/** Subset del régimen pensionario que el mapeo lee (tasas como porcentaje). */
export interface RegimenPensionarioParaMapeo {
  tipo: string;
  aporte_obligatorio: unknown;
  prima_seguro: unknown;
  comision_flujo: unknown;
}

/** Subset del empleado Prisma necesario para construir la entrada de cálculo. */
export interface EmpleadoParaMapeo {
  sueldo_base: unknown;
  asignacion_familiar: boolean | null;
  regimen_pensionario: RegimenPensionarioParaMapeo | null;
  contratos: ContratoConRegimen[];
  tareos: { detalles: DetalleTareoParaMapeo[] }[];
}

export interface ParametrosMapeoEntrada {
  empleado: EmpleadoParaMapeo;
  empresa: EmpresaConRegimenDefault;
  mes: number;
  anio: number;
  acumuladoRenta?: number;
  retencionesPreviasRenta?: number;
}

/** Resuelve las horas del día con la prioridad detalle > nomenclatura > default. */
function resolverHorasDia(detalle: DetalleTareoParaMapeo): number {
  const tm = detalle.tipo_marcacion;
  const horasDetalle = aNumero(detalle.horas);
  if (horasDetalle > 0) return horasDetalle;
  if (!tm) return 0;
  const horasNomenclatura =
    aNumero(tm.horas_diurnas) + aNumero(tm.horas_nocturnas);
  if (horasNomenclatura > 0) return horasNomenclatura;
  return tm.horas_default ?? JORNADA_MAXIMA_DIARIA;
}

/** Mapea un detalle de tareo Prisma al shape puro del dominio. */
function mapearDetalleTareo(detalle: DetalleTareoParaMapeo): DetalleTareo {
  const tm = detalle.tipo_marcacion;
  const horas = resolverHorasDia(detalle);
  const horasExtras =
    horas > JORNADA_MAXIMA_DIARIA ? horas - JORNADA_MAXIMA_DIARIA : 0;
  return {
    fecha: new Date(),
    horasTrabajadas: horas,
    horasExtras,
    esNocturno: aNumero(tm?.horas_nocturnas) > 0,
    esFeriado: false,
    asistio: tm?.es_laborable ?? false,
  };
}

/** Mapea el régimen pensionario Prisma (porcentajes) a la afiliación de dominio. */
function mapearAfiliacion(
  regimen: RegimenPensionarioParaMapeo | null,
): AfiliacionPensionaria | null {
  if (!regimen) return null;
  if (regimen.tipo === 'ONP') {
    return {
      sistema: SistemaPensionario.ONP,
      tasas: {
        aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
        primaSeguro: 0,
        comisionFlujo: 0,
      },
    };
  }
  return {
    sistema: SistemaPensionario.AFP,
    tasas: {
      aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
      primaSeguro: aNumero(regimen.prima_seguro) / 100,
      comisionFlujo: aNumero(regimen.comision_flujo) / 100,
    },
  };
}

/**
 * Construye el `EntradaCalculo` puro a partir de las filas Prisma del empleado.
 * El contrato del período (si existe) tiene prioridad para el régimen laboral.
 */
export function mapearEntradaCalculo(
  params: ParametrosMapeoEntrada,
): EntradaCalculo {
  const { empleado, empresa, mes, anio } = params;
  const contratoPeriodo = empleado.contratos?.[0] ?? null;
  const regimenLaboral = resolverRegimenLaboral(contratoPeriodo, empresa);

  const detalles = empleado.tareos?.[0]?.detalles ?? [];
  const tareo = detalles.map(mapearDetalleTareo);

  return {
    regimenLaboral,
    remuneracionBasica: aNumero(empleado.sueldo_base),
    // Asignación familiar (10% RMV por ley). El campo de dominio se llama
    // `tieneHijos` por razones históricas, pero la fuente de verdad es el derecho
    // del trabajador: `empleado.asignacion_familiar`. El legacy fijaba este flag en
    // 0 para TODOS (subpago heredado); aquí se cablea el dato real para que la
    // asignación se pague cuando corresponde, igual que el camino de detalle
    // (`mapear-entrada-detalle.ts`, `tieneAsignacionFamiliar`). Ambos caminos
    // comparten ahora la MISMA fuente: `empleado.asignacion_familiar`.
    tieneHijos: !!empleado.asignacion_familiar,
    afiliacion: mapearAfiliacion(empleado.regimen_pensionario),
    periodo: {
      anio,
      mes,
      // Fecha de referencia = último día del mes para resolver parámetros legales.
      fecha: new Date(anio, mes, 0),
    },
    tareo,
    acumuladoRenta: params.acumuladoRenta ?? 0,
    retencionesPreviasRenta: params.retencionesPreviasRenta ?? 0,
  };
}
