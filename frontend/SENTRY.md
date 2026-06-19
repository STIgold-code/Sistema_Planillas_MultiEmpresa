# Sentry (frontend)

Observabilidad de errores del frontend Next.js.

## Archivos de configuracion

Todos en la raiz de `frontend/`:

- `sentry.client.config.ts` — Browser runtime (errores en el cliente)
- `sentry.server.config.ts` — Node.js runtime (SSR, Server Actions, Route Handlers)
- `sentry.edge.config.ts` — Edge runtime (middleware.ts, edge routes)
- `instrumentation.ts` — Next.js hook que carga las configs anteriores
- `next.config.ts` — Wrapped con `withSentryConfig` para build-time

## Variables de entorno

### Obligatorias en prod/staging

Agregar al `.env.local` y a Railway (service `frontend-app`):

```env
# DSN del proyecto Next.js en Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o0000000.ingest.sentry.io/0000000
```

**Nota**: lleva prefijo `NEXT_PUBLIC_` para que Next.js lo exponga al cliente.
Tambien se lee desde `SENTRY_DSN` (server-side fallback) si no esta el public.

### Opcionales (build-time, para subir source maps)

```env
SENTRY_ORG=tu-org-slug
SENTRY_PROJECT=rrhh-ermir-frontend
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

Sin estas, el build funciona pero los stack traces en Sentry van minificados.
**Recomendado activarlas en Railway** para tener stack traces legibles.

### Opcionales (runtime, tienen defaults)

```env
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production  # default: NODE_ENV
SENTRY_ENVIRONMENT=production              # mismo para server
NEXT_PUBLIC_APP_VERSION=$RAILWAY_GIT_COMMIT_SHA
SENTRY_RELEASE=$RAILWAY_GIT_COMMIT_SHA
```

## Comportamiento si `NEXT_PUBLIC_SENTRY_DSN` no esta definido

Sentry NO se inicializa. Desarrollo local sin envio de eventos.

## Como obtener los valores

1. Crear cuenta en https://sentry.io (gratis)
2. Crear proyecto tipo **Next.js**
3. Settings → Client Keys (DSN) → copiar el DSN → `NEXT_PUBLIC_SENTRY_DSN`
4. Settings → Organization → copiar slug → `SENTRY_ORG`
5. Settings → Projects → copiar slug → `SENTRY_PROJECT`
6. Settings → Auth Tokens → Create New Token con scope `project:releases` y `project:read` → `SENTRY_AUTH_TOKEN`

## Features activos

| Feature | Detalle |
|---------|---------|
| Error tracking | Client + Server + Edge |
| Performance monitoring | `tracesSampleRate: 0.1` en prod |
| Session replay | Solo on-error, textos maskeados, media bloqueada |
| PII protection | `sendDefaultPii: false` |
| Source maps | Se suben en build si hay `SENTRY_AUTH_TOKEN` |
| Request error capture | Via `onRequestError` en `instrumentation.ts` |

## Verificacion post-deploy

1. Configurar `NEXT_PUBLIC_SENTRY_DSN` en Railway (service frontend-app) y redeploy
2. Abrir la app en browser y lanzar un error de prueba desde devtools:
   ```js
   throw new Error("Sentry test");
   ```
3. En Sentry dashboard, deberias ver el evento con stack trace en < 30 segundos

## Referencias

- [`@sentry/nextjs` docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
