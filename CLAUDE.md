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

- **`FF_SUCAMEC` / `NEXT_PUBLIC_FF_SUCAMEC`** (default `false`): módulo de control de seguridad privada,
  heredado de la base RRHH y **oculto por decisión de producto**. El código permanece intacto; con el
  flag en `false` no se registra el módulo backend ni se muestran menú/rutas en el frontend. Las tablas
  de SUCAMEC saldrán del schema en la Fase 3 (migración inicial limpia); recuperables desde git si se piden.

## Convenciones del equipo

- Commits en español, conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
  Sin atajos ni hacks. Mejores prácticas profesionales siempre.
- UI / textos al usuario final: **español neutral (tuteo peruano)**, no rioplatense. Cliente en Perú.
- Verificar compilación (`npx tsc --noEmit`) antes de reportar algo como listo.
- Ejecutar lint y tests antes de commitear. Responsive obligatorio (desktop / tablet / mobile).

## Plan de fases

0. **Bootstrap** (en curso): heredar base RRHH limpia, ocultar SUCAMEC, baseline que compila.
1. **Dominio del motor** (el corazón): interfaz `CalculadoraRegimen`, conceptos puros, los 6 regímenes,
   factory. Todo con tests (TDD).
2. **Parámetros legales versionados**: tabla + seed + servicio que resuelve por fecha.
3. **Schema + persistencia**: modelo Prisma normalizado, repos, migración inicial limpia (sin las 63
   migraciones heredadas ni tablas de SUCAMEC).
4. **Casos de uso + API**: `generar-planilla`, `recalcular-boleta`, controllers delgados.
5. **Frontend**: gestión empresas/trabajadores (heredado), generación de planilla, boleta PDF.
6. **Exportación**: PDF de boleta + Excel de planilla, configurable por empresa.

**Orden de ataque: dominio primero, UI último.** Formalizar con SDD (proposal → specs por régimen →
design → tasks) antes de implementar el motor.
