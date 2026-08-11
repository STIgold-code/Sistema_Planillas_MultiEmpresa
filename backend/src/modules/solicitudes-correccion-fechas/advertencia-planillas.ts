/**
 * Advertencia por corregir fechas de un contrato que ya fue liquidado.
 *
 * Corregir las fechas de un contrato NO recalcula las planillas ya emitidas.
 * Si el rango afectado toca un período con planilla APROBADA o PAGADA, el
 * aprobador tiene que enterarse — pero no se bloquea: la corrección suele ser
 * justamente el arreglo de un dedazo, y bloquearla dejaría el dato malo vivo.
 *
 * REGLA DE ORO del repo: la ventana de un período SIEMPRE sale de las fechas
 * persistidas (`fecha_inicio`/`fecha_fin` del período de tareo), nunca del mes
 * calendario. Con día de corte, "julio" puede ser 26/06 → 25/07.
 */

import { VentanaPeriodo, fechaCalendarioLocal } from '../tareo/ventana-periodo';
import { obtenerNombreMes } from '../../common/utils/datetime.util';

/** Rango de fechas afectado por la corrección. `hasta` en null = indefinido. */
export interface RangoAfectado {
  desde: Date;
  hasta: Date | null;
}

/** Período con planilla cerrada, con su ventana real ya resuelta. */
export interface PeriodoLiquidado {
  anio: number;
  mes: number;
  ventana: VentanaPeriodo;
}

/**
 * Unión de la vigencia actual del contrato y la propuesta: es el tramo de
 * tiempo cuyo tratamiento en planilla cambia de sentido con la corrección.
 *
 * Si cualquiera de las dos vigencias es indefinida (sin fecha de fin), la unión
 * también lo es: el contrato cubre desde `desde` en adelante.
 */
export function calcularRangoAfectado(
  fechaInicioActual: Date | string,
  fechaFinActual: Date | string | null,
  fechaInicioPropuesta: Date | string,
  fechaFinPropuesta: Date | string | null,
): RangoAfectado {
  const inicioActual = fechaCalendarioLocal(fechaInicioActual);
  const inicioPropuesta = fechaCalendarioLocal(fechaInicioPropuesta);
  const desde = inicioActual < inicioPropuesta ? inicioActual : inicioPropuesta;

  if (!fechaFinActual || !fechaFinPropuesta) {
    return { desde, hasta: null };
  }

  const finActual = fechaCalendarioLocal(fechaFinActual);
  const finPropuesta = fechaCalendarioLocal(fechaFinPropuesta);
  return {
    desde,
    hasta: finActual > finPropuesta ? finActual : finPropuesta,
  };
}

/** True si la ventana del período se cruza con el rango afectado. */
export function ventanaSolapaRango(
  ventana: VentanaPeriodo,
  rango: RangoAfectado,
): boolean {
  if (ventana.fechaFin < rango.desde) return false;
  if (rango.hasta !== null && ventana.fechaInicio > rango.hasta) return false;
  return true;
}

/** Períodos liquidados que se cruzan con el rango afectado, en orden. */
export function periodosLiquidadosAfectados(
  periodos: PeriodoLiquidado[],
  rango: RangoAfectado,
): PeriodoLiquidado[] {
  return periodos
    .filter((periodo) => ventanaSolapaRango(periodo.ventana, rango))
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes);
}

/**
 * Máximo de períodos enumerados en el mensaje. Un contrato indefinido de varios
 * años puede tocar decenas: listarlos todos no se lee y además desbordaría el
 * `VarChar(1000)` de la columna.
 */
const MAX_PERIODOS_ENUMERADOS = 12;

/**
 * Texto de la advertencia, o null si no hay períodos afectados. Se persiste y
 * se muestra al aprobador; por eso va en español neutro y sin tecnicismos.
 */
export function mensajeAdvertenciaPlanillas(
  periodos: PeriodoLiquidado[],
): string | null {
  if (periodos.length === 0) return null;

  const etiquetas = periodos
    .slice(0, MAX_PERIODOS_ENUMERADOS)
    .map((periodo) => `${obtenerNombreMes(periodo.mes)} ${periodo.anio}`)
    .join(', ');

  const restantes = periodos.length - MAX_PERIODOS_ENUMERADOS;
  const detalle =
    restantes > 0 ? `${etiquetas} y ${restantes} período(s) más` : etiquetas;

  return (
    `El cambio afecta períodos con planilla aprobada o pagada (${detalle}): ` +
    `los cálculos existentes no se recalculan automáticamente.`
  );
}
