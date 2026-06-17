// Utilidad para extraer el mensaje de error de las respuestas de la API.
//
// IMPORTANTE: el cliente de `lib/api.ts` lanza un objeto plano `ApiError`
// ({ message, statusCode, error }), que NO es una instancia de `Error`.
// Por eso `err instanceof Error` siempre da false y el mensaje real del
// backend se pierde. Este helper lee el `message` de forma segura tanto si
// el error es un `ApiError` plano como si es un `Error` real.

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const mensaje = (err as { message?: unknown }).message;
    if (typeof mensaje === "string" && mensaje.trim().length > 0) {
      return mensaje;
    }
  }
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  return fallback;
}
