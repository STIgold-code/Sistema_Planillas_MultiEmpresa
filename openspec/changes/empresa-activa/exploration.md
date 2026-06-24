# Exploración — Empresa activa cambiable (selector de empresa)

> Fase SDD: Exploración. Solo relevamiento, sin diseño ni código.
> Change: `empresa-activa`. Fecha: 2026-06-24.

## Objetivo de la feature
Permitir que un usuario (superadmin) cambie, **dentro del mismo sistema y con un solo login**, la "empresa activa" sobre la que trabaja — de modo que todas las pantallas (empleados, planillas, etc.) pasen a mostrar los datos de la empresa seleccionada. Hoy cada usuario está atado a UNA empresa fija.

## Hallazgo central (lo que hace la feature TRATABLE)
**Todo el aislamiento multi-tenant nace de un único valor: `req.user.empresa_id`, que se llena en un solo lugar** (`backend/src/modules/auth/strategies/jwt.strategy.ts:30-62`, vía `include: { empresa }`). Los ~326 usos de `user.empresa_id` en 37 controllers consumen ese valor.

Implicancia: si la "empresa activa" se resuelve en ese punto único **y se valida contra una lista blanca de empresas accesibles por el usuario**, los 326 consumidores siguen funcionando **sin tocarse**. El riesgo es exclusivamente de autorización.

## Estado actual (con evidencia)

### Modelo de datos
- `Usuario.empresa_id` (NOT NULL, 1:N) — un usuario pertenece a UNA empresa. **No hay tabla puente usuario–empresa.**
- `Rol.empresa_id` + `@@unique([nombre, empresa_id])` — los roles/permisos son **por empresa**. El "Administrador" de empresa A ≠ el de empresa B.
- ~38 entidades cuelgan de `empresa_id`. Datos nacionales compartidos (sin empresa): `ParametroLegal`, `Banco`, `RegimenPensionario`, ubigeo.

### Resolución de la empresa actual
- El **JWT NO lleva empresa_id** (solo `sub`, `email`). La empresa se rehidrata desde la DB en cada request (jwt.strategy).
- Los controllers pasan `user.empresa_id` como primer parámetro a los services (patrón uniforme pero disperso: 326 usos).
- Canal paralelo: `AuditContextInterceptor` copia `user.empresa_id` al contexto (AsyncLocalStorage) para la auditoría.

### Seguridad existente (anti-IDOR)
- Patrón consistente: `if (id !== user.empresa_id && !permisos.includes('*')) throw Forbidden` (companies.controller) y `recurso.empresa_id !== empresaId` (sedes, tareo, etc.).
- **Superadmin = rol con `'*'`** en `permisos`. Pero ese rol también tiene `empresa_id` → hoy el superadmin es "superadmin DE UNA empresa".
- `GET /companies` ya devuelve TODAS las empresas si el usuario tiene `'*'`.

### Frontend
- No hay contexto global de empresa. `useEmpresa()` se llama suelto en 6 componentes (cada uno fetchea `/companies/me`).
- El sidebar muestra el nombre de empresa desde `usuario.empresa`.
- El selector iría en el `SidebarHeader` (hoy con branding hardcodeado).

## Puntos de impacto
1. **Punto único de resolución**: `jwt.strategy.ts` — decidir de dónde sale el `empresa_id` efectivo.
2. **Modelo**: definir el conjunto de empresas accesibles por usuario (hoy no existe).
3. **Roles por empresa**: resolver qué permisos aplican en la empresa destino.
4. **Auditoría**: que registre la empresa activa correcta.
5. **Frontend**: contexto/store de empresa activa + selector + invalidación de caché al cambiar.

## Riesgos
- 🔴 **Escalada de tenant**: aceptar la empresa activa del cliente sin validar acceso = leer/escribir datos de otra empresa. Es EL riesgo.
- 🔴 **Roles cruzados**: aplicar permisos de la empresa origen en la destino.
- 🟠 Auditoría atribuida a empresa equivocada (relevante legalmente).
- 🟠 Tokens: si la empresa activa va en el JWT, el cambio implica reemisión + interacción con revocación/refresh.
- 🟠 Caché stale en el frontend tras el cambio.

## Preguntas abiertas de diseño (a decidir antes de proponer)
1. **¿Quién cambia de empresa?** ¿Solo superadmin (acceso a TODAS) o usuarios con un subconjunto explícito de empresas (requiere tabla puente)?
2. **¿Qué permisos en la empresa destino?** ¿`'*'` mantiene acceso total en todas (simple) o rol propio por empresa (rico, requiere modelo nuevo)?
3. **¿Dónde vive la empresa activa?** JWT (reemisión), header/claim validado por request, o persistida en `Usuario`.
4. **¿Se preserva la semántica de `user.empresa_id`?** (sobrescribirla deja los 326 consumidores intactos).
5. Datos en vuelo al cambiar (planillas borrador, etc.): ¿descartar/bloquear/permitir?
6. ¿Registrar el switch como evento de auditoría?
