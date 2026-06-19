import { DateTime, Settings } from 'luxon';

// Zona horaria de Peru
export const PERU_TIMEZONE = 'America/Lima';

// Configurar Luxon para usar Peru como zona horaria por defecto
Settings.defaultZone = PERU_TIMEZONE;

/**
 * Obtiene la fecha y hora actual en zona horaria de Peru
 */
export function ahoraPeru(): DateTime {
  return DateTime.now().setZone(PERU_TIMEZONE);
}

/**
 * Obtiene la fecha actual en Peru (sin hora) como string ISO (YYYY-MM-DD)
 */
export function fechaHoyPeru(): string {
  return ahoraPeru().toISODate();
}

/**
 * Obtiene la fecha actual en Peru como objeto Date de JavaScript
 * La fecha se ajusta a medianoche en Peru
 */
export function fechaHoyPeruDate(): Date {
  const dt = ahoraPeru().startOf('day');
  return dt.toJSDate();
}

/**
 * Detecta si un Date es midnight UTC exacto (patrón de Prisma @db.Date).
 * Prisma siempre devuelve campos DATE como midnight UTC (00:00:00.000Z).
 * Timestamps reales prácticamente nunca caen exactamente en midnight UTC.
 */
function esMidnightUTC(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

/**
 * Detecta si un string ISO representa midnight UTC (patrón de Prisma @db.Date serializado).
 * Cuando Prisma dates se serializan a JSON (ej: en respuestas API), llegan como
 * "2025-01-08T00:00:00.000Z" o "2025-01-08T00:00:00Z".
 * Un string date-only como "2025-01-08" (sin T) NO tiene este problema.
 */
function esStringMidnightUTC(date: string): boolean {
  return date.endsWith('T00:00:00.000Z') || date.endsWith('T00:00:00Z');
}

/**
 * Extrae la parte date-only de un string ISO y crea un DateTime en zona Peru.
 * "2025-01-08T00:00:00.000Z" → DateTime{2025-01-08, zone: America/Lima}
 */
function dateStringAPeruPreservandoDia(date: string): DateTime {
  const soloFecha = date.split('T')[0];
  return DateTime.fromISO(soloFecha, { zone: PERU_TIMEZONE });
}

/**
 * Convierte una fecha a DateTime en zona horaria Peru.
 *
 * Para Date objects que son midnight UTC exacto (patrón de Prisma @db.Date),
 * preserva los componentes de fecha en UTC para evitar el shift de día -1
 * al convertir a Peru (UTC-5).
 *
 * @param date Fecha en UTC o cualquier zona horaria
 */
export function convertirAFechaPeru(date: Date | string): DateTime {
  // Prisma @db.Date como Date object: midnight UTC exacto
  if (date instanceof Date && esMidnightUTC(date)) {
    const utcDt = DateTime.fromJSDate(date, { zone: 'utc' });
    return DateTime.fromObject(
      { year: utcDt.year, month: utcDt.month, day: utcDt.day },
      { zone: PERU_TIMEZONE },
    );
  }

  // Prisma @db.Date serializado a JSON: "2025-01-08T00:00:00.000Z"
  if (typeof date === 'string' && esStringMidnightUTC(date)) {
    return dateStringAPeruPreservandoDia(date);
  }

  const dt =
    typeof date === 'string'
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(date);
  return dt.setZone(PERU_TIMEZONE);
}

/**
 * Formatea una fecha para mostrar en Peru
 * @param date Fecha a formatear
 * @param formato Formato de salida (default: 'dd/MM/yyyy')
 */
export function formatearFechaPeru(
  date: Date | string | DateTime,
  formato: string = 'dd/MM/yyyy',
): string {
  let dt: DateTime;

  if (date instanceof DateTime) {
    dt = date.setZone(PERU_TIMEZONE);
  } else if (typeof date === 'string' && esStringMidnightUTC(date)) {
    // Prisma @db.Date serializado: preservar día
    dt = dateStringAPeruPreservandoDia(date);
  } else if (typeof date === 'string') {
    dt = DateTime.fromISO(date).setZone(PERU_TIMEZONE);
  } else if (esMidnightUTC(date)) {
    // Prisma @db.Date: preservar día sin shift de timezone
    const utcDt = DateTime.fromJSDate(date, { zone: 'utc' });
    dt = DateTime.fromObject(
      { year: utcDt.year, month: utcDt.month, day: utcDt.day },
      { zone: PERU_TIMEZONE },
    );
  } else {
    dt = DateTime.fromJSDate(date).setZone(PERU_TIMEZONE);
  }

  return dt.toFormat(formato);
}

/**
 * Formatea una fecha y hora para mostrar en Peru
 * @param date Fecha a formatear
 * @param formato Formato de salida (default: 'dd/MM/yyyy HH:mm')
 */
export function formatearFechaHoraPeru(
  date: Date | string | DateTime,
  formato: string = 'dd/MM/yyyy HH:mm',
): string {
  return formatearFechaPeru(date, formato);
}

/**
 * Obtiene el inicio del dia en Peru para una fecha dada
 * @param date Fecha (default: hoy)
 */
export function inicioDelDiaPeru(date?: Date | string): Date {
  const dt = date ? convertirAFechaPeru(date) : ahoraPeru();
  return dt.startOf('day').toJSDate();
}

/**
 * Obtiene el fin del dia en Peru para una fecha dada
 * @param date Fecha (default: hoy)
 */
export function finDelDiaPeru(date?: Date | string): Date {
  const dt = date ? convertirAFechaPeru(date) : ahoraPeru();
  return dt.endOf('day').toJSDate();
}

/**
 * Crea una fecha en zona horaria de Peru a partir de componentes
 * @param year Ano
 * @param month Mes (1-12)
 * @param day Dia
 */
export function crearFechaPeru(year: number, month: number, day: number): Date {
  return DateTime.fromObject(
    { year, month, day },
    { zone: PERU_TIMEZONE },
  ).toJSDate();
}

/**
 * Parsea una fecha string en formato ISO y la interpreta en zona horaria Peru
 * @param fechaISO Fecha en formato ISO (YYYY-MM-DD)
 */
export function parsearFechaISOenPeru(fechaISO: string): Date {
  return DateTime.fromISO(fechaISO, { zone: PERU_TIMEZONE }).toJSDate();
}

/**
 * Compara si dos fechas son el mismo dia en Peru
 */
export function esMismoDiaPeru(
  fecha1: Date | string,
  fecha2: Date | string,
): boolean {
  const dt1 = convertirAFechaPeru(fecha1);
  const dt2 = convertirAFechaPeru(fecha2);
  return dt1.hasSame(dt2, 'day');
}

/**
 * Verifica si una fecha es hoy en Peru
 */
export function esHoyPeru(fecha: Date | string): boolean {
  return esMismoDiaPeru(fecha, new Date());
}

/**
 * Suma dias a una fecha manteniendo la zona horaria de Peru
 * @param fecha Fecha base
 * @param dias Numero de dias a sumar (puede ser negativo)
 */
export function sumarDiasPeru(fecha: Date | string, dias: number): Date {
  const dt = convertirAFechaPeru(fecha);
  return dt.plus({ days: dias }).toJSDate();
}

/**
 * Obtiene el inicio del mes en Peru para una fecha dada
 * @param date Fecha (default: hoy)
 */
export function inicioDelMesPeru(date?: Date | string): Date {
  const dt = date ? convertirAFechaPeru(date) : ahoraPeru();
  return dt.startOf('month').toJSDate();
}

/**
 * Obtiene el fin del mes en Peru para una fecha dada
 * @param date Fecha (default: hoy)
 */
export function finDelMesPeru(date?: Date | string): Date {
  const dt = date ? convertirAFechaPeru(date) : ahoraPeru();
  return dt.endOf('month').toJSDate();
}

/**
 * Obtiene los nombres de los meses en espanol
 */
export function obtenerNombreMes(mes: number): string {
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return meses[mes - 1] || '';
}

/**
 * Convierte numero a texto en espanol (para fechas en contratos)
 */
export function numeroATexto(num: number): string {
  const unidades = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
  ];
  const decenas = ['', 'diez', 'veinte', 'treinta'];
  const especiales: Record<number, string> = {
    10: 'diez',
    11: 'once',
    12: 'doce',
    13: 'trece',
    14: 'catorce',
    15: 'quince',
    16: 'dieciseis',
    17: 'diecisiete',
    18: 'dieciocho',
    19: 'diecinueve',
    20: 'veinte',
    21: 'veintiuno',
    22: 'veintidos',
    23: 'veintitres',
    24: 'veinticuatro',
    25: 'veinticinco',
    26: 'veintiseis',
    27: 'veintisiete',
    28: 'veintiocho',
    29: 'veintinueve',
    30: 'treinta',
    31: 'treinta y uno',
  };

  if (especiales[num]) return especiales[num];
  if (num < 10) return unidades[num];

  const decena = Math.floor(num / 10);
  const unidad = num % 10;

  if (unidad === 0) return decenas[decena];
  return `${decenas[decena]} y ${unidades[unidad]}`;
}

/**
 * Lee una fecha @db.Date de Prisma (almacenada como midnight UTC) como DateTime en UTC.
 * Preserva el día correcto sin desplazamiento de timezone.
 *
 * IMPORTANTE: Usar para LEER campos @db.Date de Prisma.
 * Para ESCRIBIR fechas desde input de usuario, usar parsearFechaISOenPeru().
 *
 * @example
 * leerFechaPrisma(new Date('2025-01-08T00:00:00Z')).day === 8  // Correcto
 * // vs convertirAFechaPeru que daría day === 7 en Peru (UTC-5)
 */
export function leerFechaPrisma(fecha: Date | string): DateTime {
  if (typeof fecha === 'string') {
    return DateTime.fromISO(fecha.split('T')[0], { zone: 'utc' });
  }
  return DateTime.fromJSDate(fecha, { zone: 'utc' });
}

/**
 * Extrae la parte de fecha (YYYY-MM-DD) de un Date o string sin problema de timezone.
 * Para Date objects de Prisma (que vienen como midnight UTC), lee en UTC para preservar el día.
 * Para strings ISO, extrae la parte de fecha directamente.
 *
 * @example
 * toDateOnly(new Date('2025-01-08T00:00:00.000Z')) → '2025-01-08'
 * toDateOnly('2025-01-08T00:00:00.000Z') → '2025-01-08'
 * toDateOnly('2025-01-08') → '2025-01-08'
 */
export function toDateOnly(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  if (typeof date === 'string') {
    return date.split('T')[0].split(' ')[0];
  }

  // Prisma @db.Date viene como midnight UTC - leer en UTC para preservar el día
  const dt = DateTime.fromJSDate(date, { zone: 'utc' });
  return dt.toISODate();
}

/**
 * Formatea una fecha en formato largo para documentos legales
 * Ejemplo: "21 de enero de 2026" o "veintiuno de enero de dos mil veintiseis"
 */
export function formatearFechaLargaPeru(
  fecha: Date | string,
  enTexto: boolean = false,
): string {
  const dt = convertirAFechaPeru(fecha);
  const dia = dt.day;
  const mes = obtenerNombreMes(dt.month);
  const ano = dt.year;

  if (enTexto) {
    const diaTexto = numeroATexto(dia);
    return `${diaTexto} de ${mes} del ${ano}`;
  }

  return `${dia} de ${mes} del ${ano}`;
}
