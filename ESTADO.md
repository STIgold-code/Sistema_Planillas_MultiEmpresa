# ESTADO — Sistema de Planillas MultiEmpresa

> Última actualización: 2026-06-18. Rama de trabajo: `feat/motor-planillas-paridad-general`.

## Qué se hizo

De repo vacío a motor de planillas integrado:

1. **Bootstrap (Fase 0):** base heredada de RRHH limpia, SUCAMEC oculto tras feature flag
   (`FF_SUCAMEC` / `NEXT_PUBLIC_FF_SUCAMEC`), `CLAUDE.md`/`README`/`.gitignore` propios.
2. **Planificación SDD:** propuesta + specs de los 6 regímenes + diseño + tareas (en engram).
3. **Motor de cálculo (Fase 1):** hexagonal + DDD táctico, los 6 regímenes peruanos vía
   estrategia + factory, orquestador sin `if` por régimen (OCP). TDD, paridad General al céntimo
   contra el motor legacy. Todos los archivos del dominio < 500 líneas.
4. **Base de datos:** `regimen_laboral` (Contrato override + Empresa default) y tabla
   `ParametroLegal`. 61 migraciones heredadas colapsadas en un `init` limpio, aplicado a la BD
   local `planillas_multiempresa` y verificado. Seed idempotente de parámetros legales.
5. **Integración (PR6):** motor nuevo es la fuente de los montos del régimen en el camino real;
   W1 resuelto (`conceptosRegimen()`); adapter Prisma de parámetros; servicio partido.
6. **Cierre de migración (PR7):** ~110 campos auxiliares del DTO modelados en el dominio,
   **motor legacy `calcular-empleado.ts` retirado** con paridad al céntimo; servicios heredados
   partidos bajo 500 líneas.

7. **Revisión adversarial + fixes (PR #1):** 3 revisores independientes encontraron 7 críticos
   (bypass de guardia de certificación en updateDetalle/generarBoletas, IDOR cross-tenant en
   periodoTareo, doble conteo agrario prorrateado, bonif. 30334 huérfana en CC/agrario, falta
   UNIQUE + resolución de vigencia no determinista en ParametroLegal). **Todos corregidos con
   test de regresión.** PR #1 **mergeado a `main`**.

Estado de tests: **350 passed, 7 skipped** (los 5 puntos legales no confirmados), 7 snapshots golden.

## Fase 4–5 — Régimen end-to-end (en curso)

- **PR #2 (mergeado):** API expone `regimen_laboral` (contrato override + empresa default) + test e2e que prueba que el régimen fluye API→motor y bloquea no-certificados.
- **PR #3 (mergeado):** UI — selector de régimen en contrato/empresa, `RegimenBadge`, fuente única `lib/regimenes.ts`.
- **PR #4 (mergeado):** planilla guarda el régimen usado (snapshot) y lo muestra (columna + resumen multi-régimen); modal de bloqueo de certificación con buena UX.
- **PR #5 (mergeado):** la boleta expone el régimen (leído del detalle 1:1) + limpieza de lint en exportación.
- **PR #6 (mergeado):** hardening de seguridad (guards a nivel de clase en ContratosController).

El circuito está cerrado de punta a punta: pantalla → API → motor → planilla → boleta.

**Auditoría de seguridad (superficie nueva):** 0 críticos / 0 high / 0 medium. Multi-tenant sólido,
sin IDOR, mass assignment bloqueado (whitelist), guardia de certificación sin caminos de bypass.
Veredicto: segura para producción.

## Pendiente

- **Validación de contador (bloqueante para Agrario/CC):** 5 puntos legales marcados `it.skip`
  (vacaciones agrario, base CONAFOVICER, BAE/SCTR, días mínimos grati CC, movilidad). Agrario y
  Construcción civil quedan `certificadoProduccion=false` hasta esa firma.
- **Asignación familiar:** ✅ CORREGIDA (PR #7) — se paga el 10% RMV según `Empleado.asignacion_familiar`.
  Dos asunciones a confirmar con contador: es afecta a pensión/EsSalud (default correcto, Ley 25129) y
  no se prorratea por días.
- **Fases siguientes:** API/casos de uso (Fase 4), Frontend (Fase 5), Exportación configurable (Fase 6).
- **Deploy:** crear proyecto Sentry NUEVO para este producto (no reusar el de ERMIR).

## Cómo correr

```bash
cd backend && npm install && npx prisma generate
npx prisma migrate deploy        # aplica el init a la BD
npm test                         # 389 passed, 7 skipped
npm run start:dev                # puerto 4001
```
