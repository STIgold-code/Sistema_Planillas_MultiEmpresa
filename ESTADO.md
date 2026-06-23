# ESTADO — Sistema de Planillas MultiEmpresa

> Última actualización: 2026-06-23. Rama principal: `main`.

## Resumen ejecutivo

El producto está en **fase de cierre / hardening**, no de construcción. Las 6 fases
técnicas del plan están implementadas y con tests en verde. El circuito está cerrado
de punta a punta: pantalla → API → motor → planilla → boleta.

**Estado de calidad:** 0 usos de `any`, 0 errores de ESLint (backend además 0 warnings),
`tsc --noEmit` limpio en backend y frontend, CI bloqueante en cada PR. Tests backend:
**377 passed, 7 skipped** (los 5 puntos legales sin confirmar + 2 relacionados).

## Fases (estado real)

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Bootstrap (base RRHH limpia, repo propio) | ✅ Completa |
| 1 | Motor de dominio: interfaz `CalculadoraRegimen`, 6 regímenes, factory, conceptos (hexagonal + DDD táctico, OCP, TDD) | ✅ Completa |
| 2 | Parámetros legales versionados (`ParametroLegal` + `dominio/parametros`) | ✅ Completa |
| 3 | Schema normalizado + migración limpia; **SUCAMEC eliminado** (PR #12) | ✅ Completa |
| 4 | Casos de uso + API (`planillas-calcular`, `carga`, `consulta`, controller) | ✅ Completa |
| 5 | Frontend (gestión, generación de planilla, boleta) | ✅ Completa |
| 6 | Exportación PDF boleta + Excel planilla | ✅ Completa |

Los 6 regímenes peruanos (General, Pequeña empresa, Microempresa, Agrario, Construcción
civil, Hogar) están implementados vía estrategia + factory; el orquestador no tiene
`if (regimen === ...)` (OCP). Paridad General al céntimo contra el motor legacy, que ya
fue retirado. Todos los archivos del dominio < 500 líneas.

## Calidad de código (PRs #8–#12, jun 2026)

- **#8** — eliminados ~440 usos de `any`; ESLint `no-explicit-any: error`; workflow de CI creado.
- **#9** — saldados ~352 errores de lint heredados de RRHH; gate de lint pasa a bloqueante.
- **#10** — limpiados 108 warnings del frontend (quedan 11 del React Compiler, en `warn` consciente).
- **#11** — backend a 0 errores y 0 warnings; `no-unsafe-argument` y `no-floating-promises` a `error`.
- **#12** — **SUCAMEC eliminado por completo** (schema, backend, frontend, permisos, flag, migración).

CI (`.github/workflows/ci.yml`) corre en cada PR: `tsc` + ausencia de `any` + tests + lint, todo bloqueante.

## Pendiente

- **Validación de contador (bloqueante para Agrario / Construcción civil):** 5 puntos legales
  marcados `it.skip` (vacaciones agrario, base CONAFOVICER, BAE/SCTR, días mínimos grati CC,
  movilidad). Agrario y CC quedan `certificadoProduccion=false` hasta esa firma. **No es código:
  es validación legal humana.**
- **Asignación familiar:** corregida (PR #7) — 10% RMV según `Empleado.asignacion_familiar`.
  Dos asunciones a confirmar con contador: afecta a pensión/EsSalud (default Ley 25129) y no se
  prorratea por días.
- **Migración SUCAMEC:** `20260623120000_eliminar_sucamec` dropea `carnets_sucamec`. Aplicar con
  `migrate deploy` por entorno (confirmar que no haya datos a preservar; el módulo estaba oculto y sin uso).
- **Deploy:** crear proyecto Sentry NUEVO para este producto (no reusar el de ERMIR).
- **Deuda menor:** 11 warnings frontend del React Compiler (falsos positivos pre-Compiler, en `warn`).

## Cómo correr

```bash
cd backend && npm install && npx prisma generate
npx prisma migrate deploy        # aplica migraciones a la BD
npm test                         # 377 passed, 7 skipped
npm run start:dev                # puerto 4001
```

> Nota de entorno: `node` no está en el PATH del sistema; hay un node funcional embebido en
> Visual Studio (`...\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe`).
