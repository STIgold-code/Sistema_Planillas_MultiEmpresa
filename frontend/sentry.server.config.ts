/**
 * Configuracion de Sentry para ejecuciones en el servidor (SSR, Server Actions, Route Handlers).
 *
 * Env vars:
 *   SENTRY_DSN              - DSN del proyecto Next.js en Sentry
 *   SENTRY_ENVIRONMENT      - production | staging | development
 *   SENTRY_RELEASE          - SHA de git o version
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    "development";
  const release =
    process.env.SENTRY_RELEASE ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_APP_VERSION;
  const isProd = environment === "production";

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    sendDefaultPii: false,
  });
}
