# CLAUDE.md — Sistema de Planillas MultiEmpresa

Guía para Claude Code al trabajar en este repositorio. Léela completa antes de tocar código.
Para el contexto extendido de las decisiones de arquitectura, ver `CONTEXTO-Sistema-Planillas-MultiEmpresa.md`.

## Qué es

Sistema de planillas (nómina) **multiempresa** bajo la **legislación laboral peruana**.
Producto nuevo e independiente, heredado como punto de partida del sistema RRHH (base ERMIR),
con repo, base de datos y deploy separados. No comparte runtime con el origen.

**El valor del producto** está en el motor de cálculo parametrizado por **régimen laboral peruano**,
no en "multiempresa" (eso se hereda resuelto). Ahí va el esfuerzo y el riesgo técnico.

## Regímenes laborales (alcance: los 6 privados peruanos)

General (D.L. 728), Pequeña empresa (REMYPE), Microempresa (REMYPE), Agrario (Ley 31110),
Construcción civil (régimen propio) y Trabajadoras del hogar (Ley 31047).

- El régimen se define a nivel de **contrato/trabajador**, no solo de empresa. La empresa aporta
  un `regimen_default`; el contrato lo puede sobrescribir.
- Agregar un régimen nuevo NO debe tocar código existente (principio Abierto/Cerrado).

## Decisión arquitectónica (formal — respetar)

**NestJS modular + núcleo de dominio hexagonal con DDD táctico para el motor de planillas, Clean Code en todo.**

| Concepto | ¿Aplica? | Dónde |
|----------|----------|-------|
| Arquitectura hexagonal (puertos/adaptadores) | Selectivo | Solo módulo `planillas` |
| DDD táctico (value objects, entidades, domain services, lenguaje ubicuo) | Sí | Dominio de planillas |
| DDD estratégico (CQRS, event sourcing, aggregates pesados) | No | Sobreingeniería hoy (YAGNI) |
| Clean Code + SOLID | Siempre | Todo el repo |

El CRUD plano (auth, empleados, uploads) es NestJS modular normal. Hexagonal solo donde hay reglas ricas.

## Reglas NO NEGOCIABLES

- Cero God Components / God Services.
- El orquestador del cálculo NO tiene `if (regimen === ...)`. Recibe la estrategia resuelta por un
  factory y delega. Agregar régimen = clase nueva + 1 línea en el factory.
- Tablas normalizadas, NO JSON blobs (en lo que toca el cálculo de planilla).
- Parámetros legales (RMV, UIT, topes) **versionados por fecha** en tabla. Cero magic numbers en el dominio.
- TypeScript strict. Sin `any` sin justificar.
- Naming en **español**: variables, funciones, clases, tablas y campos.
- TDD en el motor: la ley peruana es la spec de los tests. Test antes que implementación.

## Stack

- **Backend:** NestJS 11, Prisma 5 (PostgreSQL 16), JWT (Passport), class-validator. Puerto 4001.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, React Hook Form + Zod.
- **Deploy:** Railway. **Storage:** Wasabi (S3-compatible). **Package manager:** npm.
- Multi-tenant: todo ligado a `empresa_id`. Permisos: convención `modulo:accion`, guards JWT + RBAC.

## Comandos

```bash
# Backend
cd backend
npm install
npx prisma generate
npx tsc --noEmit          # verificación de tipos (correr antes de reportar algo como listo)
npm run start:dev

# Frontend
cd frontend
npm install
npx tsc --noEmit
npm run dev
```

## Feature Flags

Convención `FF_<FLAG>` (backend, env) y `NEXT_PUBLIC_FF_<FLAG>` (frontend). Ausente = desactivado.
**No hay feature flags activos actualmente** (`features` en `frontend/src/lib/features.ts` está vacío).

> SUCAMEC (control de seguridad privada heredado de RRHH) fue **eliminado por completo** del schema
> y del código en el PR #12 (junio 2026). Ya no existe el flag `FF_SUCAMEC` ni el módulo. Recuperable
> desde git si alguna vez se reactiva.

## Convenciones del equipo

- Commits en español, conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
  Sin atajos ni hacks. Mejores prácticas profesionales siempre.
- UI / textos al usuario final: **español neutral (tuteo peruano)**, no rioplatense. Cliente en Perú.
- Verificar compilación (`npx tsc --noEmit`) antes de reportar algo como listo.
- Ejecutar lint y tests antes de commitear. Responsive obligatorio (desktop / tablet / mobile).

## Plan de fases

**Las 6 fases técnicas están implementadas y con tests en verde.** El producto está en fase de
cierre / hardening, no de construcción. Ver `ESTADO.md` para el detalle vigente.

0. ✅ **Bootstrap**: base RRHH limpia, repo propio, baseline que compila.
1. ✅ **Dominio del motor**: interfaz `CalculadoraRegimen`, conceptos puros, los 6 regímenes, factory (TDD).
2. ✅ **Parámetros legales versionados**: `ParametroLegal` + seed + servicio que resuelve por fecha.
3. ✅ **Schema + persistencia**: modelo normalizado, migración limpia, SUCAMEC eliminado (PR #12).
4. ✅ **Casos de uso + API**: cálculo de planilla, controllers delgados.
5. ✅ **Frontend**: gestión, generación de planilla, boleta.
6. ✅ **Exportación**: PDF de boleta + Excel de planilla.

**Pendiente real (no es código):** validación de un contador para certificar Agrario y Construcción
civil (5 puntos legales en `it.skip`), aplicar la migración de SUCAMEC por entorno, y Sentry de deploy.

**Calidad:** 0 `any`, 0 errores de ESLint, CI bloqueante (`tsc` + sin-any + tests + lint) en cada PR.
