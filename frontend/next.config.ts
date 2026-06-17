import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.railway.app",
      },
    ],
  },
};

/**
 * Configuracion de Sentry wrapper.
 *
 * Env vars opcionales (si no estan, el wrapper no genera source maps ni
 * conecta con Sentry durante el build, pero el runtime sigue funcionando
 * con las configs de sentry.*.config.ts):
 *
 *   SENTRY_ORG               - org slug en Sentry
 *   SENTRY_PROJECT           - project slug en Sentry
 *   SENTRY_AUTH_TOKEN        - token para subir source maps
 *
 * En build local sin estas vars, Sentry solo instrumenta runtime.
 * En Railway con las 3 vars seteadas, tambien sube source maps.
 */
export default withSentryConfig(nextConfig, {
  // Solo subir source maps si tenemos auth token
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Oculta stack traces del bundler y deshabilita upload si no hay auth token
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Desactiva widgets de Sentry en el logger
  disableLogger: true,
});
