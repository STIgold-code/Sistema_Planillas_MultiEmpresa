/**
 * Configuracion de Sentry para ejecuciones en el cliente (browser).
 *
 * Env vars:
 *   NEXT_PUBLIC_SENTRY_DSN         - DSN del proyecto Next.js en Sentry
 *   NEXT_PUBLIC_SENTRY_ENVIRONMENT - production | staging | development
 *   NEXT_PUBLIC_APP_VERSION        - SHA de git o version de la app
 *
 * Si NEXT_PUBLIC_SENTRY_DSN no esta definido, Sentry NO se inicializa.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    "development";
  const release = process.env.NEXT_PUBLIC_APP_VERSION;
  const isProd = environment === "production";

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    sendDefaultPii: false,
  });
}
