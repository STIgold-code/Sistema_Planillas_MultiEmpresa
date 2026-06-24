# Tareas — Empresa activa cambiable

> Fase SDD: Tareas. Desglose ordenado de implementación. Seguridad primero, TDD en el guard.
> Change: `empresa-activa`. Alcance: superadmin con acceso total (A + A).

## Orden de ataque
Backend de seguridad primero (el guard y sus tests son el corazón), luego frontend, luego verificación end-to-end. La feature no funciona "a medias" sin el guard validado: ese es el riesgo y va primero.

## Fase 1 — Backend: el guard de empresa activa (CORAZÓN, TDD)

- [ ] **1.1** Escribir los tests del `EmpresaActivaGuard` ANTES de la implementación (TDD), cubriendo los escenarios de seguridad de las specs:
  - Sin header → `req.user.empresa_id` queda en la empresa propia (R5).
  - Header presente + usuario superadmin + empresa existe → sobrescribe `req.user.empresa_id` con la activa (R1, R2).
  - Header presente + usuario NO superadmin → se ignora, queda la empresa propia (R3).
  - Header presente + empresa inexistente → `ForbiddenException` (R4).
- [ ] **1.2** Implementar `EmpresaActivaGuard` (lee `X-Empresa-Activa`, valida superadmin `'*'` + existencia de empresa, sobrescribe `req.user.empresa_id`). Sin `any`.
- [ ] **1.3** Registrar el guard globalmente, **después** del `JwtAuthGuard` (orden de ejecución importa: `req.user` debe existir).
- [ ] **1.4** Verificar que el `AuditContextInterceptor` tome la empresa activa (lee `user.empresa_id`, debería funcionar solo; agregar test).

## Fase 2 — Backend: auditoría del cambio (R6)

- [ ] **2.1** Endpoint `POST /auth/empresa-activa/:id` (o equivalente): valida acceso y registra el evento de cambio de empresa en auditoría. Devuelve la empresa activada.
- [ ] **2.2** Test: el cambio queda auditado; una acción posterior se atribuye a la empresa activa.

## Fase 3 — Frontend: contexto y transporte

- [ ] **3.1** `EmpresaActivaProvider` (contexto global): empresa activa en memoria + `localStorage`; expone `empresaActiva` y `setEmpresaActiva`.
- [ ] **3.2** `lib/api.ts`: agregar el header `X-Empresa-Activa: <id>` en cada request cuando hay empresa activa seleccionada.
- [ ] **3.3** Migrar los consumidores de `useEmpresa()` al contexto compartido (evitar fetches sueltos y caché stale).

## Fase 4 — Frontend: selector y UX

- [ ] **4.1** Selector de empresa en `SidebarHeader`, **visible solo para superadmins** (rol con `'*'`). Lista vía `GET /companies`.
- [ ] **4.2** Al cambiar: actualizar contexto, llamar al endpoint de auditoría, **invalidar cachés** de datos dependientes de empresa y **recargar** la vista actual.
- [ ] **4.3** Confirmar que usuarios no superadmin NO ven el selector (R7).

## Fase 5 — Verificación end-to-end

- [ ] **5.1** Como superadmin: cambiar a Empresa B y confirmar que empleados/planillas muestran datos de B (R2).
- [ ] **5.2** Seguridad: como usuario normal, intentar forzar el header → el backend lo ignora, sigue en su empresa (R3, R4).
- [ ] **5.3** Confirmar invalidación de caché visible al cambiar (logo, listados — no quedan datos de la empresa anterior).
- [ ] **5.4** `tsc --noEmit` limpio (back y front), lint sin errores, tests verdes.

## Review Workload Forecast
- Cambio acotado: 1 guard + 1 endpoint + 1 provider + 1 selector + 1 header en api client. **No toca el schema ni los 326 consumidores.**
- Estimado: < 400 líneas → **un solo PR** es viable. La parte de seguridad (Fase 1) merece revisión cuidadosa.
- Decisión de entrega: single PR, con foco de review en el `EmpresaActivaGuard`.
