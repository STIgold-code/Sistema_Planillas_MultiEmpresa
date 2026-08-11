/**
 * Validación de rango de años para fechas de contrato.
 * Los inputs type="date" aceptan años como "2926" sin protestar; esto bloquea
 * el dedazo antes de enviarlo al backend (que valida lo mismo en el DTO).
 */
const ANIO_MINIMO = 2020;
const ANIOS_HACIA_ADELANTE = 10;

/**
 * Año máximo aceptado. Se calcula en cada llamada para que la ventana
 * acompañe al paso del tiempo sin tocar código.
 */
export function anioMaximoContrato(): number {
  return new Date().getFullYear() + ANIOS_HACIA_ADELANTE;
}

/**
 * Único texto de error del rango de años. `anioIngresado` es opcional porque
 * los refinamientos de zod declaran el mensaje antes de conocer el valor.
 */
export function mensajeAnioContratoInvalido(
  etiqueta: string,
  anioIngresado?: string,
): string {
  const detalle = anioIngresado ? ` (${anioIngresado})` : '';
  return `${etiqueta} tiene un año inválido${detalle}. El año debe estar entre ${ANIO_MINIMO} y ${anioMaximoContrato()}.`;
}

/**
 * Devuelve un mensaje de error si el año de la fecha está fuera del rango
 * razonable, o null si la fecha es válida (o está vacía).
 */
export function validarAnioFechaContrato(
  fecha: string | undefined,
  etiqueta: string,
): string | null {
  if (!fecha) return null;

  const anio = parseInt(fecha.slice(0, 4), 10);

  if (isNaN(anio) || anio < ANIO_MINIMO || anio > anioMaximoContrato()) {
    return mensajeAnioContratoInvalido(etiqueta, fecha.slice(0, 4));
  }

  return null;
}

/**
 * Predicado para usar en refinamientos de zod, donde el mensaje se declara
 * aparte y solo hace falta saber si la fecha pasa o no.
 */
export function tieneAnioContratoValido(fecha: string | undefined): boolean {
  return validarAnioFechaContrato(fecha, '') === null;
}
