# Contexto del Proyecto — Sistema de Planillas MultiEmpresa

> Documento de handoff. Léelo COMPLETO antes de tocar una línea de código.
> Resume las decisiones de arquitectura y alcance acordadas con el Tech Lead (Gianpierre).

---

## 1. Qué es este proyecto

Sistema de **planillas (nómina) multiempresa bajo la legislación laboral peruana**.

Es un **producto NUEVO e INDEPENDIENTE**, derivado como base del sistema `RRHH-Ermir`
pero con vida propia: repo separado, base de datos separada, deploy separado, gestión separada.
No comparte código en runtime con ERMIR (no es un fork de GitHub vinculado; es un corte limpio
heredando código como punto de partida).

### Diferencia clave con RRHH-Ermir

| | RRHH-Ermir (origen) | Este proyecto |
|---|---|---|
| ¿Multiempresa? | Sí (multi-tenant por `empresa_id`) | Sí (igual, heredado) |
| ¿Cómo calcula la planilla? | UNA planilla a medida del cliente MSI (98 columnas fijas) | Según el **régimen laboral** de cada trabajador, bajo ley peruana genérica |

**El insight central:** "multiempresa" NO es la novedad ni el desafío — ERMIR ya lo resuelve y se
hereda gratis. Lo que diferencia y da valor a este producto es el **motor de cálculo parametrizado
por régimen laboral peruano**. Ahí está el riesgo técnico y ahí va el esfuerzo.

**NO arrastrar** el formato fijo de 98 columnas de MSI. Eso es deuda atada a un cliente. La planilla
debe ser estándar de ley peruana, y un formato custom por empresa (si se pide) se agrega después como
exportador configurable (YAGNI).

---

## 2. Regímenes laborales a soportar (alcance: TODOS los privados peruanos)

El sistema debe cubrir los **6 regímenes laborales privados** del Perú. La arquitectura debe permitir
agregar uno nuevo **sin tocar código existente** (principio Abierto/Cerrado).

| Régimen | Base legal | Gratificaciones | CTS | Vacaciones | EsSalud / Salud |
|---------|-----------|-----------------|-----|------------|-----------------|
| General (común) | D.L. 728 (LPCL) | 2 sueldos/año (jul + dic) | 1 sueldo/año | 30 días | 9% |
| Pequeña empresa | REMYPE | 1 sueldo/año (½ + ½) | ½ sueldo/año | 15 días | 9% |
| Microempresa | REMYPE | — (no aplica) | — (no aplica) | 15 días | SIS (semicontributivo) |
| Agrario | Ley 31110 | igual general (puede prorratearse) | igual general | 30 días | 9% (tasa propia) |
| Construcción civil | Régimen propio | Fiestas Patrias / Navidad (tabla propia) | CTS propia | 30 días | 9% + tabla propia |
| Trabajadoras del hogar | Ley 31047 | 1 sueldo/año | 1 sueldo/año | 30 días | 9% |

**Dato crítico:** el régimen laboral se define a nivel de **CONTRATO/trabajador**, no solo de empresa.
Una empresa puede tener gente en distintos regímenes. La empresa aporta un `regimen_default`,
el contrato lo puede sobrescribir.

### Conceptos que NO varían por régimen (calcular una sola vez, reutilizar)
- Sistema pensionario (ONP / AFP)
- Renta de 5ta categoría
- Horas extras (25% primeras 2h, 35% resto)
- Jornada nocturna (35%)

### Conceptos que SÍ varían por régimen
- Gratificaciones, CTS, Vacaciones, Asignación familiar, EsSalud/SIS, Bonificación extraordinaria (Ley 30334).

---

## 3. Decisión arquitectónica (FORMAL — respetar)

Enfoque **pragmático**, no buzzword-driven. Etiqueta honesta:
**NestJS modular + núcleo de dominio hexagonal con DDD táctico para el motor de planillas, Clean Code en todo.**

| Concepto | ¿Aplica? | Dónde |
|----------|----------|-------|
| Arquitectura Hexagonal (puertos/adaptadores) | ✅ SELECTIVO | **Solo** módulo `planillas` (donde hay reglas de negocio ricas) |
| DDD táctico (value objects, entidades, domain services, lenguaje ubicuo) | ✅ Sí | Dominio de planillas |
| Lenguaje ubicuo (código habla en términos del negocio peruano) | ✅ Sí | Todo el dominio |
| DDD estratégico (CQRS, event sourcing, aggregates pesados, event storming) | ❌ NO | Sobreingeniería para hoy — YAGNI |
| Clean Code + SOLID | ✅ Siempre | Todo el repo |

**Por qué selectivo:** hexagonal y DDD táctico SOLO donde hay lógica de negocio compleja (el motor de
regímenes). El CRUD plano (auth, empleados, uploads) es NestJS modular normal — meterle hexagonal sería
ceremonia inútil. La complejidad se gasta donde está el valor.

### Reglas NO NEGOCIABLES
- **Cero God Components / God Services.**
- El orquestador del cálculo **NO** tiene `if (regimen === 'micro')`. Recibe la estrategia ya resuelta
  por un factory y delega. Agregar régimen = nueva clase + 1 línea en el factory. Nada más se toca.
- **Tablas normalizadas, NO JSON blobs.** (ERMIR mete estudios/capacitaciones como JSON blob en la tabla
  empleados — esa deuda NO se arrastra en lo que toca el cálculo de planilla.)
- **Parámetros legales VERSIONADOS por fecha** (ver sección 5). Cero magic numbers en el dominio.
- TypeScript strict. Sin `any` sin justificar.
- Naming en **español** (variables, funciones, clases, tablas, campos).
- TDD en el motor: la ley peruana es la spec de los tests. Test antes que implementación.

---

## 4. Estructura objetivo del módulo `planillas`

```
modules/planillas/
├── dominio/                      ← lógica pura, CERO dependencias de framework (testeable sola)
│   ├── parametros/
│   │   └── parametros-legales.ts        # RMV, UIT, topes — resueltos por fecha de vigencia
│   ├── conceptos/                        # cada concepto = 1 archivo, SRP estricto
│   │   ├── gratificacion.ts
│   │   ├── cts.ts
│   │   ├── vacaciones.ts
│   │   ├── asignacion-familiar.ts
│   │   ├── essalud.ts
│   │   ├── sistema-pensionario.ts        # ONP/AFP (igual en todos)
│   │   ├── renta-quinta.ts               # 5ta categoría (igual en todos)
│   │   ├── horas-extras.ts               # 25%/35% (igual en todos)
│   │   └── jornada-nocturna.ts
│   ├── regimenes/
│   │   ├── calculadora-regimen.interface.ts   # EL CONTRATO (DIP)
│   │   ├── regimen-general.ts
│   │   ├── regimen-pequena-empresa.ts
│   │   ├── regimen-microempresa.ts
│   │   ├── regimen-agrario.ts
│   │   ├── regimen-construccion-civil.ts
│   │   ├── regimen-hogar.ts
│   │   └── regimen.factory.ts            # mapea enum régimen → estrategia concreta
│   └── motor/
│       └── calcular-boleta.ts            # orquestador — NO conoce regímenes concretos
├── aplicacion/                   ← casos de uso (services NestJS delgados)
│   ├── generar-planilla.service.ts
│   └── recalcular-boleta.service.ts
└── infraestructura/              ← Prisma, repos, controllers
    ├── planillas.controller.ts
    └── planillas.repository.ts
```

### SOLID aplicado
- **SRP** → cada concepto hace una cosa; cada régimen compone conceptos.
- **OCP** → régimen nuevo = clase nueva; el motor nunca se modifica.
- **LSP** → las 6 calculadoras son intercambiables tras la interfaz.
- **ISP** → interfaces chicas por concepto, no una interfaz gigante.
- **DIP** → el caso de uso depende de `CalculadoraRegimen` (abstracción), no de clases concretas.

---

## 5. Modelo de datos núcleo (Prisma)

```
Empresa         → regimen_default, tipo_contribuyente
Trabajador      → datos personales
Contrato        → regimen_laboral (override de empresa), remuneracion, sistema_pensionario
PeriodoPlanilla → mes, año, empresa_id, estado (borrador / cerrada)
Boleta          → trabajador + periodo + snapshot del cálculo
ConceptoBoleta  → cada línea calculada (ingreso/descuento/aporte) — NORMALIZADO, no JSON blob
ParametroLegal  → clave, valor, vigencia_desde, vigencia_hasta  (RMV, UIT, topes)
```

### Parámetros legales versionados (CRÍTICO)
RMV, UIT, topes de aporte y tasas **cambian cada año por ley**. Si se hardcodean, en enero el sistema
calcula mal y hay que tocar producción. La tabla `ParametroLegal` resuelve el valor vigente según la
**fecha del periodo de planilla** (una boleta de marzo 2026 usa la RMV vigente en marzo 2026).

---

## 6. Plan de fases

- **Fase 0 — Bootstrap:** heredar base de ERMIR limpia (sin `.git`, sin `.env`, sin `node_modules`,
  sin Excel de MSI, sin refs a Notion-Ermir). Reescribir CLAUDE.md y README para este producto.
  Commit inicial.
- **Fase 1 — Dominio del motor (EL CORAZÓN, va primero):** interfaz `CalculadoraRegimen`, conceptos
  puros, los 6 regímenes, factory. TODO con tests unitarios (TDD). Aquí se gana o se pierde el proyecto.
- **Fase 2 — Parámetros legales versionados:** tabla + seed con RMV/UIT/topes vigentes + servicio
  que resuelve por fecha.
- **Fase 3 — Schema + persistencia:** modelo Prisma normalizado, repos, migración.
- **Fase 4 — Casos de uso + API:** `generar-planilla`, `recalcular-boleta`, controllers delgados.
- **Fase 5 — Frontend:** gestión empresas/trabajadores (heredado), generación de planilla, boleta PDF.
  Componentes chicos, patrón container/presentational.
- **Fase 6 — Exportación:** PDF de boleta + Excel de planilla, configurable por empresa
  (NO hardcodear formato como hizo ERMIR).

**Orden de ataque: dominio primero, UI último.** El motor es lo de mayor riesgo. Si está sólido y
probado, el resto es plomería.

### Metodología
Formalizar con **SDD (spec-driven development)** antes de implementar: proposal → specs (un spec por
régimen) → design (esta decisión arquitectónica) → tasks. Razón: 6 regímenes con reglas legales que si
se calculan mal generan pagos incorrectos y problemas con SUNAT. No se improvisa.

---

## 7. Stack (heredado de ERMIR)

- **Backend:** NestJS 11, Prisma 5 (PostgreSQL 16), JWT (Passport), class-validator.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, React Hook Form + Zod.
- **Deploy:** Railway. **Storage:** Wasabi (S3-compatible). **Package manager:** pnpm/npm según ERMIR.
- Permisos: convención `modulo:accion`, guards JWT + RBAC.
- Multi-tenant: todo ligado a `empresa_id`.

## 8. Qué se hereda tal cual vs. qué se rediseña

- ✅ **Copiar tal cual:** auth, users, roles, companies, empleados, contratos, tareo, uploads,
  banco-documentos, multitenancy (`empresa_id`).
- ⚠️ **Ajustar:** contratos (agregar `regimen_laboral`), vacaciones (30 vs 15 días por régimen).
- 🔴 **REDISEÑAR por completo:** módulo `planillas` (es el 90% del trabajo real y el valor del producto).

## 9. Convenciones del Tech Lead (Gianpierre)

- Commits en **español**, conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).
- Sin atajos ni hacks. Mejores prácticas profesionales siempre (NO NEGOCIABLE).
- UI/textos al usuario final: **español neutral (tuteo peruano)**, no rioplatense. Cliente está en Perú.
- Verificar compilación (`npx tsc --noEmit`) antes de reportar algo como listo.
- Responsive obligatorio (desktop / tablet / mobile).
- Ejecutar lint y tests antes de commitear.
```
