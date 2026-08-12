/**
 * Concepto régimen-variable: gratificación (Ley 27735).
 *
 * Pure refactor del núcleo monetario de `calculos/gratificaciones.ts`. El
 * cálculo de "meses trabajados en el semestre" (dependiente de fechas Prisma)
 * se resuelve fuera del dominio y se inyecta como `mesesTrabajados`, de modo que
 * este concepto permanece puro.
 *
 * GENERAL (D.L. 728): 1 sueldo completo por semestre → 2 sueldos/año (jul+dic).
 * Régimenes con grati reducida (REMYPE pequeña) inyectan un factor distinto en
 * su propia estrategia, no aquí.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`. Cada estrategia decide
 * si lo invoca y con qué proporción.
 */
import { ConceptoBoleta, ResultadoConcepto, ResumenTareo } from '../tipos';

export const CLAVE_GRATIFICACION = 'gratificacion';

const MESES_SEMESTRE = 6;
/** Días del semestre: 6 meses × 30 días. Base de los treintavos del art. 3.4. */
export const DIAS_SEMESTRE = 180;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

/**
 * Días NO considerados tiempo efectivamente laborado, por MES CALENDARIO (1-12)
 * del año del período. Se alimenta de las planillas ya guardadas del semestre
 * más el tareo del mes en curso. Un mes ausente del mapa = sin ausencias.
 */
export type DiasNoLaboradosPorMes = Readonly<Record<number, number>>;

/**
 * Meses calendario del semestre que DEVENGA la gratificación de `mes`
 * (Ley 27735 art. 1 y 5): la de Fiestas Patrias corresponde a enero-junio y la
 * de Navidad a julio-diciembre. Julio, por tanto, NO deduce sus propias
 * ausencias: pertenecen al semestre de la gratificación de diciembre.
 */
export function rangoSemestreGratificacion(
  mes: number,
): { desde: number; hasta: number } | null {
  if (mes === 7) return { desde: 1, hasta: 6 };
  if (mes === 12) return { desde: 7, hasta: 12 };
  return null;
}

/** Suma los días no laborados de los meses calendario `[desde, hasta]`. */
export function sumarDiasNoLaborados(
  porMes: DiasNoLaboradosPorMes,
  desde: number,
  hasta: number,
): number {
  let total = 0;
  for (let mes = desde; mes <= hasta; mes++) total += porMes[mes] ?? 0;
  return total;
}

/**
 * Días no laborados que deduce la gratificación ORDINARIA de `mes` (7 o 12).
 * Fuera de julio/diciembre no hay gratificación ordinaria que deducir → 0.
 */
export function diasNoLaboradosDelSemestre(
  mes: number,
  porMes: DiasNoLaboradosPorMes,
): number {
  const rango = rangoSemestreGratificacion(mes);
  if (!rango) return 0;
  return sumarDiasNoLaborados(porMes, rango.desde, rango.hasta);
}

export interface EntradaGratificacion {
  mes: number;
  remuneracionComputable: number;
  mesesTrabajados: number;
  resumenTareo: ResumenTareo;
  /**
   * Días del semestre NO considerados tiempo efectivamente laborado (faltas,
   * suspensión, licencia sin goce). Ausente = 0: sin dato histórico no se
   * presume ausencia del trabajador.
   */
  diasNoLaboradosSemestre?: number;
}

/**
 * Fracción de sueldo que el régimen otorga por semestre completo (GENERAL = 1).
 *
 * D.S. 005-2002-TR art. 3.4 (texto vigente según D.S. 017-2002-TR): "El tiempo
 * de servicios para efectos del cálculo se determina por cada mes calendario
 * completo laborado en el período correspondiente. Los días que no se consideren
 * tiempo efectivamente laborado se deducirán a razón de un treintavo de la
 * fracción correspondiente."
 *
 * La "fracción correspondiente" es el sexto del semestre, así que cada día no
 * laborado descuenta `computable / 6 / 30 = computable / 180`. No deducen los
 * días asimilados a tiempo laborado por el art. 2 del mismo reglamento
 * (descanso vacacional, licencia CON goce, descansos con subsidio de seguridad
 * social y los que la ley declare expresamente como laborados).
 */
export function calcularGratificacion(
  entrada: EntradaGratificacion,
  fraccionSemestre = 1,
): ResultadoConcepto {
  const esGratificacion = entrada.mes === 7 || entrada.mes === 12;
  if (!esGratificacion) return { conceptos: [] };
  if (entrada.resumenTareo.diasTrabajados <= 0) return { conceptos: [] };

  const proporcion = entrada.mesesTrabajados / MESES_SEMESTRE;
  const devengado =
    entrada.remuneracionComputable * proporcion * fraccionSemestre;
  const treintavoDelSexto =
    (entrada.remuneracionComputable * fraccionSemestre) / DIAS_SEMESTRE;
  const deduccion =
    treintavoDelSexto * Math.max(0, entrada.diasNoLaboradosSemestre ?? 0);
  const monto = redondear2(Math.max(0, devengado - deduccion));
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_GRATIFICACION,
    descripcion: 'Gratificación',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
