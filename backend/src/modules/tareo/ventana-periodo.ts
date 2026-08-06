/**
 * Ventana de fechas de un período de tareo.
 *
 * Con día de corte (política de empresa), el período del mes M abarca del día
 * (corte+1) del mes M-1 al día corte del mes M — práctica peruana de cierre
 * anticipado para poder procesar y pagar la planilla a fin de mes. Sin corte,
 * el período es el mes calendario completo.
 *
 * `TareoDetalle.dia` es ORDINAL dentro del período (1..N); la fecha real de un
 * día se deriva con `fechaDeDia`. En períodos calendario el ordinal coincide
 * con el día del mes, así que los datos históricos no cambian de semántica.
 */

import { leerFechaPrisma } from '../../common/utils/datetime.util';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface VentanaPeriodo {
  fechaInicio: Date;
  fechaFin: Date;
}

/** Forma mínima de un período persistido: solo su ventana real. */
export interface PeriodoConVentana {
  fecha_inicio: Date;
  fecha_fin: Date;
}

export function calcularVentanaPeriodo(
  anio: number,
  mes: number,
  diaCorte: number | null | undefined,
): VentanaPeriodo {
  if (!diaCorte) {
    return {
      fechaInicio: new Date(anio, mes - 1, 1),
      fechaFin: new Date(anio, mes, 0),
    };
  }
  return {
    fechaInicio: new Date(anio, mes - 2, diaCorte + 1),
    fechaFin: new Date(anio, mes - 1, diaCorte),
  };
}

/** Cantidad de días del período (ambos extremos inclusive). */
export function diasDelPeriodo(fechaInicio: Date, fechaFin: Date): number {
  const inicio = new Date(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    fechaInicio.getDate(),
  );
  const fin = new Date(
    fechaFin.getFullYear(),
    fechaFin.getMonth(),
    fechaFin.getDate(),
  );
  return Math.round((fin.getTime() - inicio.getTime()) / MS_POR_DIA) + 1;
}

/** Fecha real del día ordinal `dia` (1..N) dentro del período. */
export function fechaDeDia(fechaInicio: Date, dia: number): Date {
  return new Date(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    fechaInicio.getDate() + (dia - 1),
  );
}

/** Día ordinal (1..N) que corresponde a una fecha dentro del período, o null si cae fuera. */
export function diaDeFecha(
  fechaInicio: Date,
  fechaFin: Date,
  fecha: Date,
): number | null {
  const dia =
    Math.round(
      (new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate(),
      ).getTime() -
        new Date(
          fechaInicio.getFullYear(),
          fechaInicio.getMonth(),
          fechaInicio.getDate(),
        ).getTime()) /
        MS_POR_DIA,
    ) + 1;
  if (dia < 1 || dia > diasDelPeriodo(fechaInicio, fechaFin)) return null;
  return dia;
}

/** Fecha real del día ordinal `dia` en formato date-only "YYYY-MM-DD". */
export function fechaDeDiaIso(fechaInicio: Date, dia: number): string {
  const fecha = fechaDeDia(fechaInicio, dia);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const diaMes = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${diaMes}`;
}

/**
 * Etiqueta corta "dd/mm" de la fecha real del día ordinal `dia`. Se usa para
 * enumerar días en reportes y advertencias cuando el período NO es calendario:
 * ahí el ordinal por sí solo no le dice nada al usuario.
 */
export function etiquetaDiaMes(fechaInicio: Date, dia: number): string {
  const fecha = fechaDeDia(fechaInicio, dia);
  const diaMes = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${diaMes}/${mes}`;
}

/**
 * Convierte una fecha de calendario al valor que Prisma persiste en un campo
 * `@db.Date` (medianoche UTC), para poder compararla en queries contra
 * `fecha_inicio` / `fecha_fin` de un período sin desfases de zona horaria.
 */
export function fechaComoDbDate(fecha: Date | string): Date {
  const dt = leerFechaPrisma(fecha);
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day));
}

/**
 * Convierte una fecha `@db.Date` de Prisma (que llega como medianoche UTC) al
 * espacio de componentes locales en el que operan estos helpers, preservando el
 * día de calendario. Sin esto, leer `periodo.fecha_inicio` con getters locales
 * en Perú (UTC-5) devolvería el día anterior.
 */
export function fechaCalendarioLocal(fecha: Date | string): Date {
  const dt = leerFechaPrisma(fecha);
  return new Date(dt.year, dt.month - 1, dt.day);
}

/**
 * REGLA DE ORO: la ventana de un período SIEMPRE se lee de la BD, nunca se
 * reconstruye desde anio/mes. Este helper la normaliza para poder operar con el
 * resto de funciones de este módulo.
 */
export function ventanaDePeriodo(periodo: PeriodoConVentana): VentanaPeriodo {
  return {
    fechaInicio: fechaCalendarioLocal(periodo.fecha_inicio),
    fechaFin: fechaCalendarioLocal(periodo.fecha_fin),
  };
}

/** Rango de días ordinales (ambos extremos inclusive) dentro de un período. */
export interface RangoOrdinal {
  desde: number;
  hasta: number;
}

/**
 * Intersección entre la ventana del período y un rango de fechas reales,
 * expresada en días ORDINALES del período. Devuelve null si no hay solape.
 *
 * Es la traducción canónica "rango de fechas → rango de `TareoDetalle.dia`":
 * sin ella, filtrar detalles por fechas obliga a asumir que el ordinal es el día
 * del mes, lo que solo vale en períodos calendario.
 */
export function rangoOrdinalEnPeriodo(
  ventana: VentanaPeriodo,
  fechaInicio: Date | string,
  fechaFin: Date | string,
): RangoOrdinal | null {
  const inicioRango = fechaCalendarioLocal(fechaInicio);
  const finRango = fechaCalendarioLocal(fechaFin);
  if (inicioRango > ventana.fechaFin || finRango < ventana.fechaInicio) {
    return null;
  }

  const inicioEfectivo =
    inicioRango > ventana.fechaInicio ? inicioRango : ventana.fechaInicio;
  const finEfectivo = finRango < ventana.fechaFin ? finRango : ventana.fechaFin;

  const desde = diaDeFecha(
    ventana.fechaInicio,
    ventana.fechaFin,
    inicioEfectivo,
  );
  const hasta = diaDeFecha(ventana.fechaInicio, ventana.fechaFin, finEfectivo);
  if (desde === null || hasta === null) return null;

  return { desde, hasta };
}

/**
 * True si la ventana coincide con un mes calendario completo (empresa sin día de
 * corte). Se usa para conservar el comportamiento histórico donde corresponde
 * (por ejemplo, rotular las columnas del Excel con el número de día).
 */
export function esPeriodoCalendario(
  fechaInicio: Date,
  fechaFin: Date,
): boolean {
  if (fechaInicio.getDate() !== 1) return false;
  if (fechaInicio.getFullYear() !== fechaFin.getFullYear()) return false;
  if (fechaInicio.getMonth() !== fechaFin.getMonth()) return false;
  const ultimoDiaDelMes = new Date(
    fechaFin.getFullYear(),
    fechaFin.getMonth() + 1,
    0,
  ).getDate();
  return fechaFin.getDate() === ultimoDiaDelMes;
}
