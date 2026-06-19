/**
 * Detección del error de bloqueo por régimen no certificado al calcular planilla.
 *
 * Shape real del backend (confirmado en `planillas-calcular.service.ts`):
 * lanza `BadRequestException` (HTTP 400) con un mensaje plano del tipo:
 *
 *   No se puede calcular la planilla del empleado {nombres} {apellido}:
 *   El régimen "AGRARIO" no está certificado para producción: ...
 *
 * El cálculo aborta en el PRIMER empleado no certificado, por lo que el mensaje
 * nombra a UN trabajador (no una lista). El front recibe un `ApiError`
 * (`{ message, statusCode }`), NO una instancia de `Error`.
 *
 * Decisión: detectamos por statusCode 400 + frase de certificación (robusto).
 * Intentamos extraer el nombre del trabajador con un regex tolerante; si no
 * matchea, NO inventamos parseos: caemos al mensaje completo del backend.
 */

/** Frase estable del backend que marca el bloqueo de certificación. */
const FRASE_CERTIFICACION = 'no está certificado para producción';

export interface BloqueoCertificacion {
  /** Nombre del trabajador afectado, si se pudo extraer del mensaje. */
  trabajador: string | null;
  /** Mensaje crudo del backend, siempre presente como respaldo. */
  mensajeOriginal: string;
}

interface PosibleApiError {
  message?: unknown;
  statusCode?: unknown;
}

/** Extrae un mensaje de texto de cualquier error (ApiError plano o Error). */
function obtenerMensaje(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as PosibleApiError).message;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

/**
 * Devuelve los datos del bloqueo si el error corresponde a un régimen no
 * certificado; en caso contrario `null` (el llamador sigue su flujo genérico).
 */
export function detectarBloqueoCertificacion(
  error: unknown,
): BloqueoCertificacion | null {
  const mensaje = obtenerMensaje(error);
  if (!mensaje.includes(FRASE_CERTIFICACION)) return null;

  // Extracción tolerante del nombre: "...del empleado {nombre}: El régimen..."
  const match = mensaje.match(/empleado\s+(.+?):\s*El régimen/i);
  const trabajador = match?.[1]?.trim() || null;

  return { trabajador, mensajeOriginal: mensaje };
}
