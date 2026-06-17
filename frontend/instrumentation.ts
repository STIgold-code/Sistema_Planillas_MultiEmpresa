/**
 * Next.js Instrumentation hook.
 *
 * Se ejecuta una vez al iniciar el servidor de Next.js.
 * Carga la configuracion de Sentry correspondiente al runtime.
 *
 * Referencia: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
