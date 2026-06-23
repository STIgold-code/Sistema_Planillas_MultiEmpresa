/**
 * Extrae un mensaje de error legible desde un valor desconocido capturado
 * en un bloque catch. Evita la interpolacion directa de objetos en strings
 * (que produciria "[object Object]") y respeta el tipado estricto.
 */
export function obtenerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}
