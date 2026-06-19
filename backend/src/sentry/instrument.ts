/**
 * Inicializacion de Sentry.
 *
 * IMPORTANTE: este archivo debe importarse ANTES que cualquier otro
 * en main.ts para que los instrumentadores automaticos de Sentry
 * se registren correctamente en modulos como @nestjs/core, express, etc.
 *
 * Env vars requeridas:
 *   SENTRY_DSN              - URL de conexion al proyecto Sentry (Node.js project)
 *   SENTRY_ENVIRONMENT      - production | staging | development (default: NODE_ENV)
 *   SENTRY_RELEASE          - SHA de git o version (default: RAILWAY_GIT_COMMIT_SHA)
 *   SENTRY_TRACES_SAMPLE_RATE - 0.0 a 1.0 (default: 0.1 en prod, 1.0 en dev)
 *   SENTRY_PROFILES_SAMPLE_RATE - 0.0 a 1.0 (default: 0.1 en prod, 0 en dev)
 *
 * Si SENTRY_DSN no esta definido, Sentry NO se inicializa (modo noop).
 * Esto permite desarrollar localmente sin enviar eventos.
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
  const release =
    process.env.SENTRY_RELEASE ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    undefined;

  const isProd = environment === 'production';

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProd ? '0.1' : '1.0'),
    ),
    profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE ?? (isProd ? '0.1' : '0'),
    ),
    integrations: [nodeProfilingIntegration()],
    // En dev capturamos todo, en prod filtramos ruido
    beforeSend(event) {
      // No enviar errores 4xx esperables (validation, auth)
      const status = event.contexts?.response?.status_code;
      if (
        typeof status === 'number' &&
        status >= 400 &&
        status < 500 &&
        status !== 429
      ) {
        return null;
      }
      return event;
    },
    // Scrub de datos sensibles antes de enviar
    sendDefaultPii: false,
  });
}
