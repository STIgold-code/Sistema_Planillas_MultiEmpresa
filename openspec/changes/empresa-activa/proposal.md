# Propuesta — Empresa activa cambiable (selector de empresa)

> Fase SDD: Propuesta. Qué construimos y con qué enfoque (el "qué", no el "cómo" detallado).
> Change: `empresa-activa`. Decisión de alcance: **superadmin con acceso total a todas las empresas (A + A)**.

## Intención
Que un usuario **superadmin** pueda cambiar, dentro del mismo login, la **empresa activa** sobre la que trabaja, mediante un selector en la interfaz. Al cambiar, todas las pantallas pasan a operar sobre la empresa elegida, manteniendo intacto el aislamiento entre empresas.

## Alcance

### Incluido
- Concepto de **empresa activa** en la sesión (distinta, para un superadmin, de la empresa "propia" del usuario).
- Endpoint para **cambiar la empresa activa**, que valida el derecho del usuario antes de aceptarla.
- **Selector de empresa** en el frontend (en el header del sidebar), visible solo para superadmins.
- Que **todos los módulos** (empleados, planillas, etc.) operen sobre la empresa activa, sin reescribir sus 326 consumidores.
- Que la **auditoría** registre la empresa activa correcta y el evento de cambio.

### Excluido (por decisión A + A; se puede agregar después)
- Usuarios "multiempresa" con un **subconjunto** explícito de empresas (tabla puente usuario–empresa).
- **Permisos distintos por empresa** (rol por empresa). El superadmin tiene acceso total en todas.
- Cambio de empresa para usuarios **no superadmin** (siguen atados a su empresa, como hoy).

## Enfoque (alto nivel)
Aprovechar el **punto único de resolución**: hoy `req.user.empresa_id` se arma en la JWT strategy y los 326 consumidores lo leen. La idea es que ese valor pase a ser la **empresa activa** en lugar de la empresa fija del usuario, resuelta y **validada** en ese mismo punto central. Así los módulos no se tocan.

Reglas:
- Un **superadmin** (rol con `'*'`) puede elegir **cualquier** empresa como activa.
- Un usuario normal **no** tiene empresa activa cambiable: su empresa activa = su empresa propia, siempre (comportamiento actual, sin cambios ni riesgo).
- La empresa activa **nunca** se acepta del cliente sin validar el derecho del usuario a operarla (regla de seguridad central).
- El cambio de empresa queda **auditado**.

El mecanismo técnico concreto de "dónde vive y cómo viaja la empresa activa" (token reemitido vs. header validado vs. persistencia) se decide en la fase de **Diseño**, evaluando seguridad, UX y tamaño de cambio.

## Riesgos y mitigación
- 🔴 **Escalada de tenant** → validación obligatoria del derecho a la empresa en el punto central; default seguro (sin superadmin, empresa activa = propia).
- 🟠 **Auditoría** → la empresa activa se propaga al contexto de auditoría; el switch se registra como evento.
- 🟠 **Caché frontend stale** → al cambiar, se invalidan/recargan los datos dependientes de empresa.

## Resultado esperado
Un superadmin entra con un login, ve un selector de empresa arriba, elige una, y todo el sistema muestra esa empresa — con el aislamiento de seguridad garantizado. Los clientes finales (usuarios de cada empresa) no ven cambio alguno.

## Próximas fases
- **Specs**: requisitos y escenarios (incluyendo los de seguridad: "un no-superadmin no puede cambiar de empresa", "un superadmin no puede activar una empresa inexistente", etc.).
- **Diseño**: el mecanismo técnico de la empresa activa (token vs. header vs. persistencia), el punto exacto de resolución y validación, e impacto en auditoría/refresh de token.
- **Tareas**: desglose de implementación.
