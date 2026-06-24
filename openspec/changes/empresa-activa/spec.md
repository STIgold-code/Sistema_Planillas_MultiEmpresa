# Especificación — Empresa activa cambiable

> Fase SDD: Specs. Requisitos y escenarios verificables (la base de los tests).
> Change: `empresa-activa`. Alcance: superadmin con acceso total (A + A).

## Definiciones
- **Superadmin**: usuario cuyo rol incluye el permiso `'*'`.
- **Empresa propia**: la `empresa_id` con la que el usuario está registrado.
- **Empresa activa**: la empresa sobre la que el usuario está operando ahora. Para un usuario normal siempre es la propia; para un superadmin puede ser cualquiera.

## Requisitos

### R1 — Selección de empresa (superadmin)
El superadmin puede ver la lista de todas las empresas y elegir una como empresa activa.

- **Escenario**: superadmin lista empresas
  - Dado un usuario superadmin autenticado
  - Cuando solicita la lista de empresas
  - Entonces recibe todas las empresas del sistema

- **Escenario**: superadmin activa una empresa
  - Dado un superadmin autenticado
  - Cuando selecciona la Empresa B como activa
  - Entonces todas las consultas siguientes devuelven datos de la Empresa B

### R2 — Todos los módulos respetan la empresa activa
Empleados, contratos, planillas, tareo, etc. muestran y operan sobre los datos de la empresa activa.

- **Escenario**: datos coherentes con la empresa activa
  - Dado un superadmin con Empresa B activa
  - Cuando consulta empleados / planillas
  - Entonces solo ve los de la Empresa B (nunca mezcla con otra)

### R3 — Usuarios normales no cambian de empresa (SEGURIDAD)
Un usuario sin `'*'` no puede operar sobre una empresa distinta de la propia.

- **Escenario**: usuario normal intenta activar otra empresa
  - Dado un usuario NO superadmin de la Empresa A
  - Cuando intenta activar la Empresa B (por UI o manipulando la petición)
  - Entonces la solicitud es rechazada y sigue operando sobre la Empresa A

### R4 — Empresa activa siempre validada (SEGURIDAD)
La empresa activa nunca se acepta del cliente sin validar el derecho del usuario.

- **Escenario**: empresa inexistente
  - Dado un superadmin
  - Cuando intenta activar una empresa que no existe
  - Entonces la solicitud es rechazada y la empresa activa no cambia

- **Escenario**: petición manipulada
  - Dado un usuario normal que falsifica el indicador de empresa activa en la petición
  - Cuando el backend procesa la petición
  - Entonces ignora el valor manipulado y usa la empresa propia del usuario

### R5 — Default seguro
Si no hay empresa activa válida indicada, el sistema usa la empresa propia del usuario (comportamiento actual).

- **Escenario**: sin selección
  - Dado cualquier usuario autenticado sin empresa activa indicada
  - Cuando hace una consulta
  - Entonces opera sobre su empresa propia

### R6 — Auditoría del cambio
El cambio de empresa activa queda registrado, y las acciones se auditan bajo la empresa activa correcta.

- **Escenario**: trazabilidad
  - Dado un superadmin que cambia a la Empresa B y crea un empleado
  - Entonces la auditoría registra el cambio de empresa y atribuye la creación a la Empresa B

### R7 — Transparencia para usuarios finales
Los usuarios no superadmin no ven el selector ni cambio alguno en su experiencia.

## Fuera de alcance (no especificado aquí)
- Subconjuntos de empresas por usuario.
- Permisos distintos por empresa.
- Cambio de empresa para usuarios normales.
