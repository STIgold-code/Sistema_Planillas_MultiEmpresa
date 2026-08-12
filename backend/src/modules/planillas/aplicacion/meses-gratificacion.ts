/**
 * Meses calendario COMPLETOS del semestre que devengan la gratificación
 * ordinaria (Ley 27735 y su reglamento D.S. 005-2002-TR).
 *
 * Vive en el BORDE de aplicación porque depende de fechas Prisma (`@db.Date`,
 * midnight UTC) y de luxon: el dominio nunca las ve, recibe el número ya
 * resuelto (`DatosDevengados.mesesGratificacion` en el motor de régimen,
 * `EntradaDetalle.mesesGratificacion` en el DTO completo).
 *
 * FUENTE ÚNICA para los DOS motores del cálculo. Antes solo la usaba el camino
 * de detalle (`mapear-entrada-detalle`) y el motor de régimen
 * (`calcular-boleta`) asumía SIEMPRE 6/6; como el motor SOBREESCRIBE los montos
 * load-bearing del DTO, un trabajador que ingresaba a mitad del semestre cobraba
 * —y se le persistía— la gratificación completa. Una sola implementación es lo
 * que garantiza que ambos motores den el mismo monto.
 *
 * BASE LEGAL
 *  - Ley 27735 art. 6: el monto de las gratificaciones se calcula por el tiempo
 *    efectivamente laborado en el semestre; si el trabajador tiene menos de seis
 *    meses, percibe la gratificación en forma PROPORCIONAL a los meses
 *    laborados.
 *  - D.S. 005-2002-TR art. 3.3: quien cuente con menos de seis meses percibe la
 *    gratificación en función a los MESES CALENDARIO COMPLETOS laborados en el
 *    período correspondiente → la unidad mínima es el mes completo: sin ninguno
 *    en el semestre no hay gratificación ordinaria (0/6).
 *  - D.S. 005-2002-TR art. 3.4 (texto según D.S. 017-2002-TR): "El tiempo de
 *    servicios para efectos del cálculo se determina por cada mes calendario
 *    completo laborado en el período correspondiente. Los días que no se
 *    consideren tiempo efectivamente laborado se deducirán a razón de un
 *    treintavo de la fracción correspondiente."
 *
 * CRITERIO DEL MES DE INGRESO (documentado, es una decisión):
 * el reglamento usa los treintavos SOLO para DEDUCIR; no existe un treintavo "a
 * favor" por los días sueltos del mes en que se ingresa. Por eso un ingreso el
 * 15-mar devenga la gratificación de julio por abr-may-jun = 3/6 y los 17 días
 * de marzo no suman nada. Es el mismo criterio que ya aplica la gratificación
 * TRUNCA al mes de cese incompleto (`beneficios-periodicos.ts`), y el que
 * distingue a la gratificación de la CTS (que sí reconoce días en treintavos,
 * D.S. 001-97-TR art. 21).
 */
import { leerFechaPrisma } from '../../../common/utils/datetime.util';

/** Meses de un semestre de gratificación. */
const MESES_SEMESTRE = 6;

/** Blinda el resultado ante datos incoherentes (ingreso posterior al período). */
const acotar = (meses: number): number =>
  Math.min(MESES_SEMESTRE, Math.max(0, meses));

/**
 * Meses completos del semestre que devenga la gratificación de `mes`.
 *
 * Julio devenga enero-junio y diciembre julio-diciembre (Ley 27735 art. 1 y 5).
 * Fuera de esos meses no hay gratificación ordinaria y el valor no se usa: se
 * devuelve el semestre completo por compatibilidad con el resto del motor.
 *
 * @param fechaIngreso Fecha de ingreso del TRABAJADOR (antigüedad real), no la
 *   del contrato vigente: la renovación de un contrato no reinicia el tiempo de
 *   servicios que computa el art. 6 de la Ley 27735. Ausente/null → sin
 *   evidencia de ingreso tardío, se paga el semestre completo.
 */
export function resolverMesesGratificacion(
  mes: number,
  anio: number,
  fechaIngreso: Date | string | null | undefined,
): number {
  if (mes !== 7 && mes !== 12) return MESES_SEMESTRE;

  const ingreso = fechaIngreso ? leerFechaPrisma(fechaIngreso) : null;
  const inicioSemestre =
    mes === 7 ? new Date(anio, 0, 1) : new Date(anio, 6, 1);
  if (!ingreso || ingreso.toJSDate() <= inicioSemestre) return MESES_SEMESTRE;

  const mesIngreso = ingreso.month; // luxon: 1-12
  const diaIngreso = ingreso.day;

  if (mes === 7) {
    // Meses calendario que quedan entre el ingreso y junio; el mes de ingreso
    // solo cuenta si se laboró completo (día 1).
    const meses = 7 - mesIngreso;
    return acotar(diaIngreso > 1 ? meses - 1 : meses);
  }

  const mesesDesdeIngreso =
    mesIngreso <= 6 ? MESES_SEMESTRE : 12 - mesIngreso + 1;
  const meses = Math.min(MESES_SEMESTRE, mesesDesdeIngreso);
  return acotar(diaIngreso > 1 && mesIngreso >= 7 ? meses - 1 : meses);
}
