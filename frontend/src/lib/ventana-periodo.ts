import { parseDateLocal } from './utils';

/**
 * Helpers para periodos de tareo con ventana de corte.
 *
 * El campo `dia` de un detalle de tareo es un ORDINAL (1..N) dentro del periodo,
 * no el dia del mes. La fecha real es `fecha_inicio + (dia - 1)`.
 * Para un periodo calendario (fecha_inicio el dia 1) ambos coinciden.
 *
 * Las fechas ISO tipo "2026-06-26" se parsean con `parseDateLocal` para evitar
 * el corrimiento de zona horaria de `new Date(iso)`.
 */

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha real que corresponde al dia ordinal (1..N) del periodo. */
export function fechaDeDia(fechaInicioIso: string, dia: number): Date {
  const inicio = parseDateLocal(fechaInicioIso);
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + (dia - 1));
}

/** Dia ordinal (1..N) del periodo que corresponde a una fecha real. */
export function diaDeFecha(fechaInicioIso: string, fecha: Date): number {
  const inicio = parseDateLocal(fechaInicioIso);
  const soloFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((soloFecha.getTime() - inicio.getTime()) / MILISEGUNDOS_POR_DIA) + 1;
}

/** true si el periodo arranca el dia 1 (coincide con el mes calendario). */
export function esPeriodoCalendario(fechaInicioIso: string): boolean {
  return parseDateLocal(fechaInicioIso).getDate() === 1;
}

/** Etiqueta corta de una fecha para cabeceras angostas. Ej: "26/6". */
export function etiquetaDiaMes(fecha: Date): string {
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

/** Etiqueta completa de una fecha para tooltips. Ej: "viernes, 26 de junio de 2026". */
export function etiquetaFechaCompleta(fecha: Date): string {
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
