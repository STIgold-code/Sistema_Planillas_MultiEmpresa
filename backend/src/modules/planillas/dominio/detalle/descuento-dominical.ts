/**
 * Descuento PROPORCIONAL del descanso semanal obligatorio (dominical) por
 * ausencias que no devengan.
 *
 * BASE LEGAL — D.L. 713, art. 4:
 *   «La remuneración por el día de descanso semanal obligatorio será
 *    equivalente al de una jornada ordinaria y se abonará en forma
 *    directamente proporcional al número de días efectivamente trabajados en
 *    dicha semana.»
 *
 * Consecuencia práctica (la que ya aplica la contadora del cliente): una falta
 * injustificada no pierde solo SU día — recorta además, en sextos, el dominical
 * de la semana en que ocurrió.
 *
 * ¿Por qué sextos? Porque la semana laboral ordinaria peruana es de SEIS días
 * (jornada máxima de 48 horas semanales, Const. art. 25 y D.S. 007-2002-TR
 * art. 1): el séptimo es justamente el descanso que se prorratea. Con los seis
 * días trabajados el dominical se paga íntegro; cada día no trabajado de esa
 * semana le quita un sexto.
 *
 * QUÉ RECORTA Y QUÉ NO:
 *  - RECORTAN — ausencias SIN GOCE: F (falta), S / SUS (suspensión sin pago) y
 *    LSG (licencia sin goce). No son días efectivamente trabajados ni la ley
 *    los asimila a tales.
 *  - NO RECORTAN — subsidios y descansos médicos (DM, SI, SM), licencias CON
 *    goce (LF, LP, LCG) y vacaciones: el D.S. 012-92-TR art. 4 asimila a días
 *    efectivamente trabajados, para el récord del dominical, las inasistencias
 *    por accidente o enfermedad amparadas por el seguro social y los días de
 *    suspensión de la relación laboral CON pago de remuneración.
 *
 * SEMANAS PARTIDAS: la semana se agrupa por calendario real (lunes → domingo),
 * pero solo con los días que ESTÁN en el período. Con ventana de corte
 * (26 → 25) las semanas de los bordes entran incompletas: se evalúan con lo que
 * hay, nunca se inventan días de otro período. La semana que cruza el cambio de
 * mes dentro de la ventana sí agrupa sus faltas juntas, porque es una sola
 * semana calendario.
 *
 * Puro: recibe un shape plano `DiaTareoDetalle[]`, sin Prisma ni luxon.
 */
import { redondear2 } from './redondeo';
import { DiaTareoDetalle } from './tipos-detalle';

/** Días de la semana laboral ordinaria peruana (el séptimo es el dominical). */
const DIAS_SEMANA_ORDINARIA = 6;

/**
 * Códigos de ausencia SIN GOCE: los únicos que recortan el dominical.
 * Es el mismo conjunto que queda fuera de `diasLaborables` por no devengar.
 */
export const CODIGOS_AUSENCIA_SIN_GOCE: ReadonlySet<string> = new Set([
  'F',
  'S',
  'SUS',
  'LSG',
]);

/** Semana calendario del período con su recorte de dominical. */
export interface SemanaDominical {
  /** Lunes de la semana calendario (ISO 8601: la semana va lunes → domingo). */
  lunes: Date;
  /** Ausencias sin goce de esa semana PRESENTES en el período. */
  ausenciasSinGoce: number;
  /** Fracción de dominical perdida, en sextos y con tope de 1 por semana. */
  fraccionPerdida: number;
}

/** Lunes de la semana calendario a la que pertenece `fecha`. */
function lunesDeLaSemana(fecha: Date): Date {
  // getDay(): domingo = 0 … sábado = 6. Se rota para que lunes valga 0.
  const desplazamiento = (fecha.getDay() + 6) % 7;
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate() - desplazamiento,
  );
}

function claveDeSemana(lunes: Date): string {
  return `${lunes.getFullYear()}-${lunes.getMonth()}-${lunes.getDate()}`;
}

/**
 * Agrupa las ausencias sin goce del período por semana calendario y expone el
 * recorte de dominical de cada una. Se exporta para trazabilidad: es el desglose
 * que permite cuadrar el descuento con la planilla de la contadora.
 */
export function resumirSemanasDominical(
  dias: DiaTareoDetalle[],
): SemanaDominical[] {
  const porSemana = new Map<string, SemanaDominical>();

  for (const dia of dias) {
    if (!CODIGOS_AUSENCIA_SIN_GOCE.has(dia.codigo)) continue;
    const lunes = lunesDeLaSemana(dia.fecha);
    const clave = claveDeSemana(lunes);
    const semana = porSemana.get(clave);
    if (semana) {
      semana.ausenciasSinGoce += 1;
      continue;
    }
    porSemana.set(clave, { lunes, ausenciasSinGoce: 1, fraccionPerdida: 0 });
  }

  return Array.from(porSemana.values())
    .map((semana) => ({
      ...semana,
      // Tope: por más ausencias que haya, no se puede perder más de UN
      // dominical por semana (no existe dominical negativo).
      fraccionPerdida: Math.min(
        1,
        semana.ausenciasSinGoce / DIAS_SEMANA_ORDINARIA,
      ),
    }))
    .sort((a, b) => a.lunes.getTime() - b.lunes.getTime());
}

/**
 * Descuento total del dominical del período (D.L. 713 art. 4).
 * `valorDia` es el valor del día ordinario (sueldo / 30).
 */
export function calcularDescuentoDominical(
  dias: DiaTareoDetalle[],
  valorDia: number,
): number {
  if (valorDia <= 0) return 0;
  const sextosPerdidos = resumirSemanasDominical(dias).reduce(
    (total, semana) => total + semana.fraccionPerdida,
    0,
  );
  return redondear2(valorDia * sextosPerdidos);
}
