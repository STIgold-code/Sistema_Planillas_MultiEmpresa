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
import { DetalleTareo, EntradaCalculo } from '../dominio/tipos';
import {
  RegimenPensionarioParaAfiliacion,
  resolverAfiliacionPensionaria,
} from './resolver-afiliacion-pensionaria';
import {
  DiasNoLaboradosPorMes,
  diasNoLaboradosComputables,
} from '../dominio/conceptos/gratificacion';
import { resolverMesesGratificacion } from './meses-gratificacion';
import {
  ContratoConRegimen,
  EmpresaConRegimenDefault,
  resolverRegimenLaboral,
} from './resolver-regimen-laboral';
import {
  calcularVentanaPeriodo,
  fechaDeDia,
  VentanaPeriodo,
} from '../../tareo/ventana-periodo';

/** Jornada legal máxima diaria (D.S. 007-2002-TR). */
const JORNADA_MAXIMA_DIARIA = 8;

/** Convierte Decimal/number/string de Prisma a número seguro. */
const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

/** Subset de la nomenclatura (tipo_marcacion) que el mapeo de tareo lee. */
export interface TipoMarcacionParaMapeo {
  /** Código de la nomenclatura (A, F, LSG…). Opcional por compatibilidad. */
  codigo?: string;
  es_laborable: boolean;
  horas_diurnas: number;
  horas_nocturnas: number;
  horas_default: number | null;
}

/**
 * Ausencias SIN GOCE: días laborables que el trabajador no devengó (falta,
 * suspensión, licencia sin goce). NO cuentan como asistencia: la remuneración
 * del período se prorratea sin ellos, y las cotizaciones (EsSalud, pensión,
 * renta) se calculan sobre lo DEVENGADO — igual que la planilla del contador.
 */
const AUSENCIAS_SIN_GOCE = new Set(['F', 'S', 'SUS', 'LSG']);

/** Subset del detalle de tareo que el mapeo lee. */
export interface DetalleTareoParaMapeo {
  /**
   * Día ORDINAL (1..N) dentro de la ventana del período (`TareoDetalle.dia`),
   * del que se deriva la fecha real. Opcional por compatibilidad con fixtures
   * que arman el tareo como lista ordenada: ahí se usa el orden de llegada.
   */
  dia?: number;
  horas: unknown;
  tipo_marcacion: TipoMarcacionParaMapeo | null;
}

/** Subset del régimen pensionario que el mapeo lee (tasas como porcentaje). */
export type RegimenPensionarioParaMapeo = RegimenPensionarioParaAfiliacion;

/** Subset del empleado Prisma necesario para construir la entrada de cálculo. */
export interface EmpleadoParaMapeo {
  sueldo_base: unknown;
  /**
   * Fecha de ingreso del trabajador (antigüedad real). Resuelve los meses del
   * semestre que devengan la gratificación (Ley 27735 art. 6). Opcional por
   * compatibilidad con fixtures; ausente/null → semestre completo.
   */
  fecha_ingreso?: Date | string | null;
  asignacion_familiar: boolean | null;
  /** Condición fiscal IR 5ta. null/undefined → domiciliado. */
  domiciliado?: boolean | null;
  regimen_pensionario: RegimenPensionarioParaMapeo | null;
  /**
   * Modalidad de comisión AFP elegida por el afiliado (Ley 29903). Ausente/null
   * → comisión sobre flujo, el comportamiento previo a modelar el dato.
   */
  tipo_comision_afp?: unknown;
  contratos: ContratoConRegimen[];
  tareos: { detalles: DetalleTareoParaMapeo[] }[];
}

export interface ParametrosMapeoEntrada {
  empleado: EmpleadoParaMapeo;
  empresa: EmpresaConRegimenDefault;
  mes: number;
  anio: number;
  /**
   * Ventana real del período de tareo (con día de corte puede no ser el mes
   * calendario). Si se omite, se usa el mes calendario de `mes`/`anio`.
   */
  ventanaPeriodo?: VentanaPeriodo;
  acumuladoRenta?: number;
  retencionesPreviasRenta?: number;
  /**
   * Días no laborados (F, S/SUS, LSG) por MES CALENDARIO de los meses
   * ANTERIORES del año, leídos de las planillas históricas. El mes en curso se
   * deriva aquí del propio tareo. Ausente = sin ausencias registradas.
   */
  diasNoLaboradosMesesPrevios?: DiasNoLaboradosPorMes;
  /**
   * Remuneración básica vigente al CIERRE del semestre (30-jun / 30-nov),
   * resuelta contra el historial de contratos (D.S. 005-2002-TR art. 3.2).
   * Ausente = sin evidencia histórica → se usa la básica del período.
   */
  remuneracionCierreSemestre?: number;
  /** Fecha de cierre del semestre; ausente fuera de julio y diciembre. */
  fechaCierreSemestre?: Date;
  /**
   * Promedio computable de las remuneraciones VARIABLES regulares del semestre,
   * ya filtrado por la regla de los tres meses (D.S. 005-2002-TR). Ausente = 0.
   */
  promedioVariablesGratificacion?: number;
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

/**
 * Mapea un detalle de tareo Prisma al shape puro del dominio.
 * La fecha se DERIVA del día ordinal contra la ventana del período (antes era
 * un `new Date()` de placeholder, que con día de corte no significaba nada).
 */
function mapearDetalleTareo(
  detalle: DetalleTareoParaMapeo,
  indice: number,
  ventana: VentanaPeriodo,
): DetalleTareo {
  const tm = detalle.tipo_marcacion;
  const horas = resolverHorasDia(detalle);
  const horasExtras =
    horas > JORNADA_MAXIMA_DIARIA ? horas - JORNADA_MAXIMA_DIARIA : 0;
  return {
    fecha: fechaDeDia(ventana.fechaInicio, detalle.dia ?? indice + 1),
    horasTrabajadas: horas,
    horasExtras,
    esNocturno: aNumero(tm?.horas_nocturnas) > 0,
    esFeriado: false,
    asistio:
      (tm?.es_laborable ?? false) && !AUSENCIAS_SIN_GOCE.has(tm?.codigo ?? ''),
  };
}

/**
 * Días del tareo NO considerados tiempo efectivamente laborado
 * (D.S. 005-2002-TR art. 3.4): faltas, suspensión y licencia sin goce. Los
 * subsidios, el descanso vacacional y las licencias CON goce NO cuentan aquí
 * porque el art. 2 del mismo reglamento los asimila a tiempo laborado.
 */
function contarDiasNoLaboradosDelMes(
  detalles: DetalleTareoParaMapeo[],
): number {
  return detalles.filter((d) =>
    AUSENCIAS_SIN_GOCE.has(d.tipo_marcacion?.codigo ?? ''),
  ).length;
}

/**
 * Construye el `EntradaCalculo` puro a partir de las filas Prisma del empleado.
 * El contrato del período (si existe) tiene prioridad para el régimen laboral.
 */
export function mapearEntradaCalculo(
  params: ParametrosMapeoEntrada,
): EntradaCalculo {
  const { empleado, empresa, mes, anio } = params;
  const ventana =
    params.ventanaPeriodo ?? calcularVentanaPeriodo(anio, mes, null);
  const contratoPeriodo = empleado.contratos?.[0] ?? null;
  const regimenLaboral = resolverRegimenLaboral(contratoPeriodo, empresa);

  const detalles = empleado.tareos?.[0]?.detalles ?? [];
  const tareo = detalles.map((detalle, indice) =>
    mapearDetalleTareo(detalle, indice, ventana),
  );

  // Meses calendario COMPLETOS del semestre que devenga la gratificación
  // (Ley 27735 art. 6 + D.S. 005-2002-TR art. 3.3). Se resuelve con la MISMA
  // función que el camino de detalle para que ambos motores den lo mismo: el
  // motor de régimen sobreescribe los montos load-bearing del DTO, así que si
  // aquí no se inyecta el valor, `calcular-boleta` asume 6/6 y persiste la
  // gratificación completa a quien ingresó a mitad del semestre.
  const mesesGratificacion = resolverMesesGratificacion(
    mes,
    anio,
    empleado.fecha_ingreso,
  );

  // Días no laborados que deducen la gratificación: los históricos de las
  // planillas ya guardadas más los del mes en curso (el tareo de esta corrida
  // manda sobre cualquier planilla previa del mismo mes). El dominio decide qué
  // meses del semestre son computables (Ley 27735 art. 1, 5 y 6): con ingreso a
  // mitad de semestre, los meses previos al ingreso ya no aportan sexto y sus
  // días NO vuelven a deducir (D.S. 005-2002-TR art. 3.4).
  //
  // CRITERIO (documentado): las ausencias se imputan al MES DE LA PLANILLA, no
  // al mes calendario del día. Con ventana de día de corte (p. ej. 26 → 25) la
  // planilla de julio incluye días de junio, pero las ventanas son DISJUNTAS:
  // cada ausencia se cuenta exactamente una vez y ninguna se pierde. Imputar
  // por fecha real solo el mes en curso, mientras el histórico viene keyado por
  // mes de planilla, haría que el mes del borde se contara dos veces.
  const diasNoLaboradosSemestre = diasNoLaboradosComputables(
    mes,
    mesesGratificacion,
    {
      ...params.diasNoLaboradosMesesPrevios,
      [mes]: contarDiasNoLaboradosDelMes(detalles),
    },
  );

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
    afiliacion: resolverAfiliacionPensionaria(
      empleado.regimen_pensionario,
      empleado.tipo_comision_afp,
    ),
    periodo: {
      anio,
      mes,
      // Fecha de referencia para resolver parámetros legales = fin de la ventana
      // del período (con período calendario, el último día del mes).
      fecha: ventana.fechaFin,
    },
    tareo,
    // La computable de la GRATIFICACIÓN se resuelve al cierre del semestre y
    // con el promedio de las variables regulares (D.S. 005-2002-TR art. 3.2 y
    // remuneración regular). Ambos datos vienen ya resueltos del borde: el
    // motor de régimen SOBREESCRIBE `gratificacion_monto` del DTO, así que si
    // no se inyectan aquí, la grati se paga con el sueldo de hoy y sin el
    // promedio, aunque el DTO auxiliar sí los haya contemplado.
    devengados: {
      mesesGratificacion,
      diasNoLaboradosSemestre,
      remuneracionCierreSemestre:
        params.remuneracionCierreSemestre ?? aNumero(empleado.sueldo_base),
      fechaCierreSemestre: params.fechaCierreSemestre ?? ventana.fechaFin,
      promedioVariablesGratificacion:
        params.promedioVariablesGratificacion ?? 0,
    },
    acumuladoRenta: params.acumuladoRenta ?? 0,
    retencionesPreviasRenta: params.retencionesPreviasRenta ?? 0,
    trabajadorDomiciliado: params.empleado.domiciliado ?? true,
  };
}
