# Sentry (backend)

Observabilidad de errores y performance para el backend NestJS.

## Archivos

- `instrument.ts` — Inicializacion de Sentry. Se importa ANTES que todo en `main.ts`.
- `sentry.module.ts` — Modulo NestJS que registra `SentryModule.forRoot()` y `SentryGlobalFilter`.

## Variables de entorno requeridas

Agregar a `.env` local y a Railway (service `backend-api`):

```env
# Obligatorias en prod/staging
SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o0000000.ingest.sentry.io/0000000

# Opcionales (tienen defaults sensatos)
SENTRY_ENVIRONMENT=production          # default: NODE_ENV
SENTRY_RELEASE=$RAILWAY_GIT_COMMIT_SHA # default: RAILWAY_GIT_COMMIT_SHA
SENTRY_TRACES_SAMPLE_RATE=0.1          # default: 0.1 en prod, 1.0 en dev
SENTRY_PROFILES_SAMPLE_RATE=0.1        # default: 0.1 en prod, 0 en dev
```

## Comportamiento si `SENTRY_DSN` no esta definido

Sentry NO se inicializa (modo noop). Podes desarrollar localmente sin enviar eventos.

## Como obtener el DSN

1. Crear cuenta en https://sentry.io (gratis, 5k errores/mes)
2. Crear proyecto tipo **Node.js** para el backend
3. Settings → Client Keys (DSN) → copiar el DSN
4. Pegar en `SENTRY_DSN` (Railway variable del service backend-api)

## Filtros aplicados

- Errores HTTP 4xx (excepto 429 rate limit) NO se envian a Sentry
  → reduce ruido de errores de usuario (validacion, auth, not found)
- `sendDefaultPii: false` → Sentry no captura IP ni user agent por defecto
  → para capturar user context, se hace explicitamente en el global filter

## Verificacion post-deploy

1. Despues de configurar `SENTRY_DSN` en Railway y redeploy
2. Lanzar un error de prueba desde cualquier endpoint:
   ```bash
   curl -X POST https://backend-api-production-b3d6.up.railway.app/api/sentry-test
   ```
3. En Sentry dashboard, deberias ver el evento en < 30 segundos

## Referencias

- [`@sentry/nestjs` docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- ADR-relacionado: ninguno (Sentry es una herramienta, no una decision arquitectonica)
