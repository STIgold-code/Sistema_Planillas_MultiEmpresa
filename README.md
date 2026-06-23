# Sistema de Planillas MultiEmpresa

Sistema de planillas (nómina) **multiempresa** bajo la **legislación laboral peruana**. Calcula la
planilla según el **régimen laboral** de cada trabajador, soportando los 6 regímenes privados del Perú
(General, Pequeña empresa, Microempresa, Agrario, Construcción civil y Trabajadoras del hogar).

## Arquitectura

NestJS modular con un núcleo de dominio **hexagonal + DDD táctico** para el motor de planillas, y
**Clean Code + SOLID** en todo el repositorio. El motor de cálculo está diseñado para que agregar un
régimen nuevo no requiera modificar código existente (estrategia + factory).

Ver `CLAUDE.md` y `CONTEXTO-Sistema-Planillas-MultiEmpresa.md` para el detalle de las decisiones.

## Estado

Las 6 fases técnicas están implementadas (motor de dominio, parámetros legales versionados,
persistencia, API, frontend y exportación) y el circuito está cerrado de punta a punta:
pantalla → API → motor → planilla → boleta. Ver `ESTADO.md` para el detalle vigente.

Calidad: 0 usos de `any`, 0 errores de ESLint, `tsc --noEmit` limpio y suite de tests en verde.
Cada PR pasa por CI (`tsc` + ausencia de `any` + tests + lint, bloqueante).

> Pendiente para producción: validación de un contador para certificar los regímenes Agrario y
> Construcción civil (5 puntos legales aún sin firmar).

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 11 · Prisma 5 · PostgreSQL 16 · JWT |
| Frontend | Next.js 16 · React 19 · Tailwind v4 · shadcn/ui |
| Deploy | Railway |
| Storage | Wasabi (S3-compatible) |

## Estructura

```
backend/    API NestJS + Prisma (motor de planillas, módulos de RRHH heredados)
frontend/   Aplicación Next.js (App Router)
```

## Puesta en marcha

```bash
# Backend (puerto 4001)
cd backend
npm install
npx prisma generate
npx prisma migrate deploy   # aplica las migraciones a la BD
npm test                    # suite de tests del dominio y la app
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

Configura las variables de entorno a partir de `backend/.env.example` y `frontend/.env.local`.

## Origen

Producto independiente, heredado como punto de partida del sistema RRHH base. No comparte runtime,
base de datos ni deploy con el origen.
