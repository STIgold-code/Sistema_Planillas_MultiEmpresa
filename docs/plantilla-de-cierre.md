# Plantilla de cierre del período

El Excel que el sistema entrega al área contable para que confirme lo que solo
ella sabe —saldos reales de préstamos, adelantos del mes, vacaciones, descansos
médicos, bonos— y que después se vuelve a subir para cargarlo.

Reemplaza el correo con texto libre que había que interpretar y cargar a mano.

## El flujo

1. **Descargar** — Planillas → *Plantilla de cierre* → año y mes. El libro sale
   **prellenado** con el estado que el sistema conoce hoy. No se entrega en
   blanco a propósito: es más fácil corregir que escribir de cero, y un dato
   que está mal salta a la vista.
2. **Llenar** — el área contable completa solo las columnas amarillas.
3. **Subir** — el mismo diálogo. Se muestra **qué va a cambiar**, fila por fila.
4. **Aplicar** — solo si el preview no tiene errores.

La ventana del período la manda el período de tareo si ya existe; si no, se
deriva del día de corte de la empresa (`empresas.dia_corte_tareo`). Para Grupo
BM eso da 26-jul → 25-ago, no el mes calendario.

## Las 10 hojas

| Hoja | Para qué | ¿Se carga al aplicar? |
|------|----------|----------------------|
| Instrucciones | Cómo llenarla | — |
| Periodo | Ventana, día de corte, estado del tareo | — |
| Trabajadores | Padrón + columna "¿sigue trabajando?" | Sí: reactiva reingresos |
| Prestamos | Saldo real pendiente y si continúa | Sí |
| Adelantos | Monto real a descontar y su naturaleza | Sí |
| Vacaciones y descansos | Vacaciones, DM, licencias | No — se marcan en el tareo |
| Otros conceptos | Bonos, descuentos puntuales | No — se editan sobre la planilla |
| Planilla informal | Pagos fuera de planilla | No — esas personas no existen en el sistema |
| Politica del periodo | Jornada, refrigerio, criterio de horas extras | No — es contexto |
| Control | Cuenta filas llenas vs. obligatorias | — |

## Qué carga y qué NO, y por qué

**Sí carga:** confirmar el saldo real de una deuda vigente, ajustar su cuota y
darla por cerrada (pagada o cancelada). Nada de eso necesita un documento nuevo:
solo la confirmación de quien lleva la cuenta.

**No carga: dar de alta un préstamo o adelanto nuevo.** Descontar de la
remuneración exige autorización escrita del trabajador, y `PrestamosService.create`
la exige. Una fila de Excel no es un convenio firmado. Esas filas aparecen en el
preview como *"Falta cargarlo"*, con sus datos completos, para darlas de alta
desde Préstamos adjuntando el documento.

Todo lo que sí se aplica pasa por `PrestamosService`, que es el dueño de las
reglas: movimiento `AJUSTE` por cada cambio de saldo, motivo obligatorio al
renegociar una cuota, cierre automático al llegar a cero. La importación decide
**qué** cambiar; nunca **cómo**.

## El hallazgo que motivó todo esto

Los 10 préstamos activos de Grupo BM tenían `saldo = NULL`, no `saldo = 0`.

No es lo mismo, y la diferencia importa. Según `descuentos-prestamos.ts`, un
saldo NULL significa **descuento recurrente sin monto definido**: la cuota se
descuenta *todos los meses, indefinidamente*, hasta que alguien cancele el
préstamo a mano. No es que no cobre — es que **no deja de cobrar nunca**.

Peor: `PrestamosService.update` rechazaba poner un saldo sobre un préstamo que
no lo tenía (*"es un descuento recurrente sin monto definido: no lleva saldo"*),
así que esos 10 préstamos estaban condenados a descontar para siempre sin forma
de arreglarlos desde la aplicación.

Dos cambios lo resuelven:

- **`update` ahora permite definir el saldo por primera vez**, exigiendo motivo
  escrito y dejando un movimiento `AJUSTE` que asienta el hecho. Con el saldo
  puesto, el préstamo se cierra solo al llegar a cero.
- **La plantilla muestra `SIN TOPE ⚠` en rojo**, no un cero. Escribir cero ahí
  era mentir sobre el caso más peligroso de todos.

## Notas de implementación

| Archivo | Rol |
|---------|-----|
| `plantilla-cierre-datos.ts` | Lee el estado del sistema. Solo consulta. |
| `plantilla-cierre-excel.ts` | Arma el libro: formatos, desplegables, alertas. |
| `plantilla-cierre-lectura.ts` | Módulo **puro**: buffer → filas + problemas. Sin Prisma. |
| `plantilla-cierre-importacion.service.ts` | Empareja con la base y decide el plan. |

Detalles que costaron sangre:

- **DNI con cero inicial.** Los documentos se escriben con `numFmt: '@'` (texto).
  Sin eso, `06894124` se vuelve número, pierde el cero y el `VLOOKUP` del nombre
  falla. Al leer, se indexan las dos formas por si alguien pegó el valor a mano.
- **Nunca se descarta una fila en silencio.** Una fila inaplicable sale como
  ERROR con su número y su motivo; una aplicable pero dudosa, como ADVERTENCIA.
- **Aplicar re-lee el archivo**, no confía en un plan enviado por el cliente.
- **No hay transacción única** al aplicar, a propósito: cada fila pasa por
  `PrestamosService`, que abre la suya para dejar el movimiento junto al cambio.
  Cada préstamo es independiente y la operación es idempotente — volver a subir
  el mismo archivo omite lo ya aplicado. Una interrupción se resuelve
  reintentando, no revirtiendo.
