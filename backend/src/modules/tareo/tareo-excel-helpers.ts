import { CODIGO_SIN_CONTRATO, COLORES } from './tareo-excel-constants';

/**
 * Determina si un dia (anio-mes-dia) cae dentro del rango de un contrato.
 * Devuelve false cuando no hay fecha_inicio (sin contrato).
 */
export function isDiaEnContrato(
  dia: number,
  mes: number,
  anio: number,
  fechaInicioContrato: Date | null,
  fechaFinContrato: Date | null,
): boolean {
  if (!fechaInicioContrato) return false;

  const fechaDia = new Date(anio, mes - 1, dia);
  fechaDia.setHours(0, 0, 0, 0);
  const inicioContrato = new Date(fechaInicioContrato);
  inicioContrato.setHours(0, 0, 0, 0);

  if (fechaDia < inicioContrato) return false;

  if (fechaFinContrato) {
    const finContrato = new Date(fechaFinContrato);
    finContrato.setHours(23, 59, 59, 999);
    if (fechaDia > finContrato) return false;
  }

  return true;
}

/**
 * Codigos validos cuando NO hay contrato vigente (solo SC = "Sin Contrato").
 */
export function isCodigoPermitidoFueraContrato(codigo: string | null): boolean {
  return codigo === null || codigo === CODIGO_SIN_CONTRATO;
}

/**
 * Formatea una fecha al formato peruano dd/mm/yyyy.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Mapea un estado de periodo de tareo a su color ARGB para el Excel.
 */
export function getEstadoColor(estado: string): string {
  switch (estado) {
    case 'BORRADOR':
      return COLORES.ESTADO_BORRADOR;
    case 'EN_PROCESO':
      return COLORES.ESTADO_PROCESO;
    case 'CERRADO':
      return COLORES.ESTADO_CERRADO;
    case 'ANULADO':
      return COLORES.ESTADO_ANULADO;
    default:
      return COLORES.HEADER_MEDIUM;
  }
}

/**
 * Convierte un color hex a formato ARGB para Excel.
 * @param hex Color en formato #RRGGBB o RRGGBB
 * @returns Color en formato FFRRGGBB
 */
export function hexToArgb(hex: string): string {
  const cleanHex = hex.replace('#', '').toUpperCase();
  return `FF${cleanHex}`;
}

/**
 * Calcula una version mas clara del color (simula opacidad sobre blanco).
 * @param hex Color en formato #RRGGBB o RRGGBB
 * @param opacity Opacidad deseada (0-1), ej: 0.2 para 20%
 * @returns Color claro en formato FFRRGGBB
 */
export function lightenColor(hex: string, opacity: number = 0.2): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Mezclar con blanco (255, 255, 255) segun la opacidad
  const newR = Math.round(r * opacity + 255 * (1 - opacity));
  const newG = Math.round(g * opacity + 255 * (1 - opacity));
  const newB = Math.round(b * opacity + 255 * (1 - opacity));

  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `FF${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}
