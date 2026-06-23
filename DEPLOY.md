# Deploy en Railway

Guía paso a paso para desplegar el sistema (backend + frontend + PostgreSQL) en Railway.

El repo ya viene preparado: `backend/Dockerfile`, `frontend/Dockerfile`, y un `railway.json`
en cada servicio. Lo que sigue es lo que hacés **vos** en tu cuenta de Railway.

> ⚠️ Antes de facturar de verdad (no solo probar): confirmar con un contador los valores
> legales 2026 y los 2 puntos del cálculo del régimen General pendientes de validación
> (tope de prima AFP y base afecta de la asignación familiar).

---

## 1. Crear el proyecto y la base de datos

1. En Railway: **New Project → Deploy from GitHub repo** → elegí `Sistema_Planillas_MultiEmpresa`.
2. En el proyecto: **New → Database → PostgreSQL**. Railway crea la BD y la variable `DATABASE_URL`.

## 2. Servicio Backend

1. Agregá un servicio desde el repo. En **Settings → Root Directory** poné `backend`.
   (Railway detecta `backend/railway.json` y construye con el Dockerfile.)
2. En **Variables**, cargá:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` (referencia a la BD) |
   | `JWT_SECRET` | generar: `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | otro `openssl rand -base64 32` distinto |
   | `JWT_EXPIRES_IN` | `30m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | la URL pública del frontend (la tenés tras el paso 3) |
   | `UPLOAD_PROVIDER` | `wasabi` |
   | `WASABI_ACCESS_KEY` | tu access key de Wasabi |
   | `WASABI_SECRET_KEY` | tu secret key de Wasabi |
   | `WASABI_BUCKET_NAME` | el bucket |
   | `WASABI_REGION` | ej. `us-east-1` |
   | `WASABI_ENDPOINT` | ej. `https://s3.us-east-1.wasabisys.com` |

   `PORT` lo inyecta Railway automáticamente, no lo setees a mano.
   Sentry y `PLANILLA_*` son opcionales (ver `backend/.env.example`).

3. El backend aplica las migraciones solo al arrancar (el Dockerfile corre
   `prisma migrate deploy` antes de iniciar). **Incluye la migración que elimina SUCAMEC.**

## 3. Servicio Frontend

1. Agregá otro servicio desde el mismo repo. **Root Directory** = `frontend`.
2. En **Variables**:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | la URL pública del **backend** (paso 2) |

   > Importante: `NEXT_PUBLIC_API_URL` se usa en **build time**. El Dockerfile la recibe
   > como build arg (Railway pasa las variables del servicio al build). Si la cambiás,
   > hay que **redeployar** el frontend para que tome el nuevo valor.

3. Una vez desplegado, copiá su URL pública y pegala en `FRONTEND_URL` del backend (paso 2).

## 4. Datos iniciales (seed)

Con el backend ya conectado a la BD, corré el seed una vez (desde tu máquina apuntando a la
BD de Railway, o vía Railway Shell):

```bash
cd backend
DATABASE_URL="<la DATABASE_URL de Railway>" npx prisma db seed
```

Esto carga permisos, parámetros legales y datos base.

> 🔴 **Antes de la prueba real**: verificá que los parámetros legales cargados (RMV, UIT,
> tramos de renta) sean los **vigentes** para el período. Ver `seed-parametros-legales.ts`.

## 5. Verificar

- Backend: `https://<backend>.up.railway.app` debe responder (health/login).
- Frontend: abrí su URL, deberías poder loguearte con el usuario admin del seed.
- Probá: crear empresa → empleado → contrato (régimen General) → generar planilla → boleta.

---

## Notas

- **Dos servicios, un repo** (monorepo): backend y frontend son servicios separados con
  distinto Root Directory. La BD es un tercer servicio (Railway PostgreSQL).
- **Regímenes**: solo General, Pequeña empresa, Microempresa y Hogar están certificados.
  Agrario y Construcción civil están bloqueados por código hasta la validación del contador.
- **Storage**: sin las variables `WASABI_*`, las subidas/descargas de fotos y documentos fallan.
</content>
