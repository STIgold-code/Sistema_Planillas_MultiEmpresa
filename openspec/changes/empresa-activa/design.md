# Diseño — Empresa activa cambiable

> Fase SDD: Diseño. Decisiones de arquitectura y enfoque técnico.
> Change: `empresa-activa`. Alcance: superadmin con acceso total (A + A).

## Decisión central: cómo viaja la "empresa activa"

Tres opciones evaluadas (del relevamiento):

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **(i) En el token (JWT)** | Al cambiar, se reemite un token que incluye la empresa activa | Firmada, no manipulable, viaja sola | Toca el sistema de tokens (refresh/revocación, delicado); cambio = reemitir; token "congela" la empresa |
| **(ii) Header validado por request** | El frontend manda `X-Empresa-Activa: <id>`; un punto central valida y la aplica | Stateless, no toca tokens, cambio instantáneo, validación en un único lugar | El front debe enviarlo siempre; la validación por request es obligatoria |
| **(iii) Persistida en `Usuario`** | Un campo `empresa_activa_id` en la DB | Simple, sobrevive entre sesiones | Estado mutable compartido (2 pestañas comparten empresa → confuso); escritura en DB por cambio |

### Elección: **(ii) Header validado por request**

Razones:
- **No toca el sistema de tokens** (refresh rotation + revocación), que es la parte más delicada de la seguridad actual. La opción (i) lo complicaría sin necesidad.
- **Cambio instantáneo** y por pestaña (mejor UX; dos pestañas pueden estar en empresas distintas).
- **Validación en un único punto** central, coherente con el hallazgo de que todo nace de `req.user.empresa_id`.
- El **default seguro** es natural: sin header válido → empresa propia.

## Arquitectura

### Backend — el punto único de resolución
Un **guard/interceptor `EmpresaActivaGuard`** que corre **después** de la autenticación JWT (cuando `req.user` ya está cargado), y antes de los controllers:

1. Lee el header `X-Empresa-Activa` (opcional).
2. Si no hay header → no hace nada (empresa activa = empresa propia, ya en `req.user.empresa_id`). **Default seguro.**
3. Si hay header:
   - Verifica que el usuario sea **superadmin** (`req.user.rol.permisos` incluye `'*'`). Si no → **ignora el header** (no rechaza la request; simplemente usa la empresa propia). Un usuario normal nunca puede cambiar.
   - Verifica que la empresa exista. Si no → `ForbiddenException`.
   - **Sobrescribe `req.user.empresa_id`** con la empresa activa validada.
4. Como los ~326 consumidores leen `req.user.empresa_id`, **todos operan sobre la empresa activa sin tocarse**.
5. El `AuditContextInterceptor` (que ya copia `user.empresa_id`) registra automáticamente la empresa activa correcta.

> Regla de oro de seguridad: el header **solo** se honra para superadmins y **solo** si la empresa existe. Nunca se confía en el valor crudo del cliente.

### Backend — endpoints
- **`GET /companies`**: ya devuelve todas las empresas para superadmin (existe). Es la fuente del selector.
- **(Opcional) `POST /auth/empresa-activa/:id`**: valida el acceso y registra el cambio en auditoría (R6). El front lo llama al cambiar; para los requests siguientes usa el header. Si no se quiere endpoint extra, el switch se audita en el guard la primera vez que se usa una empresa activa nueva.

### Frontend
1. **Contexto global `EmpresaActivaProvider`**: guarda la empresa activa seleccionada (en memoria + `localStorage` para persistir el refresh). Reemplaza el uso suelto de `useEmpresa()`.
2. **API client** (`lib/api.ts`): agrega el header `X-Empresa-Activa: <id>` en cada request cuando hay una empresa activa seleccionada.
3. **Selector** en el `SidebarHeader`: visible **solo si el usuario es superadmin**. Lista las empresas (`GET /companies`) y permite elegir.
4. **Al cambiar**: actualiza el contexto + (opcional) llama al endpoint de auditoría, **invalida las cachés** de datos dependientes de empresa y **recarga** la vista actual (router refresh / refetch).

## Flujo end-to-end (cambio de empresa)
1. Superadmin abre el selector → ve todas las empresas.
2. Elige "Empresa B".
3. El front guarda "Empresa B" como activa y recarga los datos.
4. Cada request siguiente lleva `X-Empresa-Activa: B`.
5. El `EmpresaActivaGuard` valida (superadmin + existe) y pone `req.user.empresa_id = B`.
6. Todos los módulos devuelven datos de la Empresa B. La auditoría los atribuye a B.
7. Un usuario normal nunca envía/honra el header → siempre su empresa propia.

## Impacto (qué se toca)
- **Nuevo**: `EmpresaActivaGuard` (backend), `EmpresaActivaProvider` + selector (frontend), header en el api client.
- **Modificado (mínimo)**: registro global del guard; `lib/api.ts` (un header); `SidebarHeader` (el selector).
- **NO se tocan**: los 326 consumidores de `user.empresa_id`, ni los services, ni el schema (alcance A+A no requiere tabla puente ni roles por empresa).
- **Auditoría**: se beneficia automáticamente; se agrega el evento de "cambio de empresa".

## Decisiones de seguridad (resumen)
1. El header solo se honra para superadmins (`'*'`).
2. La empresa activa se valida (existe) en cada request, en un punto único.
3. Default seguro: sin header válido → empresa propia.
4. Los chequeos anti-IDOR existentes (`recurso.empresa_id !== empresaId`) siguen protegiendo, ahora contra la empresa activa validada.

## Riesgos residuales
- Que algún módulo lea la empresa por una vía distinta a `req.user.empresa_id` (no detectada en el relevamiento, pero a verificar en implementación).
- Caché del frontend: hay que asegurar invalidación completa al cambiar (probar con datos visibles: logos, listados).
