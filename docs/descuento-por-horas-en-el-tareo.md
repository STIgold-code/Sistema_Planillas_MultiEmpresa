# Descuento por horas en el tareo

**Estado:** implementado en `feat/descuento-por-horas-tareo` (20 de agosto de 2026).
**Alcance:** registro y descuento de tiempo no laborado en fracciones de hora —tardanzas y
permisos parciales sin goce— desde el módulo de tareo.

---

## 1. Resumen

El motor de cálculo ya sabía descontar por horas: la cañería estaba completa pero nunca se
conectó. No era desarrollo desde cero, era habilitación. Se cerraron los cuatro gaps que la
mantenían muerta y se corrigió un defecto de redondeo que hacía que el descuento excediera el
tiempo realmente no laborado.

El cálculo, sin cambios respecto del diseño original:

```
Valor minuto = sueldo básico / 30 días / 8 horas / 60 minutos
Descuento    = valor minuto × minutos no laborados del período
```

Con un sueldo de S/ 2,700 el minuto vale S/ 0.208333…; una tardanza de 45 minutos descuenta S/ 9.38.

---

## 2. El defecto que apareció al escribir los tests

El motor redondeaba el **valor del minuto** a dos decimales antes de multiplicar:

```ts
const valorMinuto = redondear2(sueldoBase / 30 / 8 / 60); // 0.2083… → 0.21
const descuentoTardanzas = redondear2(valorMinuto * minutos);
```

Con sueldo S/ 3,000 el minuto vale 0.208333…, pero redondeado queda en 0.21. Una hora de tardanza
costaba entonces **S/ 12.60 en lugar de S/ 12.50**: diez céntimos que el trabajador no debía.

Eso no es un error de centavos, es un problema de fondo. Descontar por tardanza es legal porque se
deja de pagar tiempo que no se devengó; cobrar **más** que ese tiempo convierte el descuento en una
multa, y las sanciones pecuniarias al trabajador están prohibidas. El redondeo intermedio hacía
exactamente eso.

Corregido: el valor minuto ya no se redondea y el importe se redondea **una sola vez, al final**.
El invariante quedó fijado en `descuento-por-horas-flujo.spec.ts` — una hora de tardanza debe costar
exactamente el valor hora, y una jornada completa exactamente el valor del día.

El defecto nunca llegó a producción: sin el código de marcación `T` en el catálogo, el descuento
siempre valía cero.

---

## 3. Los cuatro gaps y cómo se cerraron

### GAP 1 — No existían los tipos de marcación `T` y `P` · RESUELTO

El catálogo de producción tenía solo `A · DL · DM · DT · F · FJ · LCG · LSG · MINA · MINA-F · V`.
Sin el código `T`, el motor nunca se disparaba.

Se agregaron al seed idempotente `backend/prisma/seed-tipos-marcacion.ts`:

| Código | Descripción | `es_laborable` | `genera_pago` | `cuenta_como` |
|--------|-------------|----------------|---------------|---------------|
| `T` | Tardanza | `true` | `true` | `TARDANZA` |
| `P` | Permiso sin goce (por horas) | `true` | `true` | `PERMISO` |

Ambos son días **laborables y devengados**: el trabajador asistió. El descuento sale por su propia
columna, no por sacar el día de la base como hacen las ausencias sin goce.

### GAP 2 — La grilla no permitía ingresar horas · RESUELTO

Al elegir una marcación cuyo `cuenta_como` es `TARDANZA` o `PERMISO`, el popover ya no cierra: pide
los minutos. Ofrece atajos de 15, 30, 60 y 120, acepta cualquier valor hasta 480 y confirma con
Enter. La celda muestra el código y los minutos debajo (`T` / `45m`), de modo que el tareo se lee
sin abrir nada.

La detección es por `cuenta_como`, no por código literal, para que agregar mañana otra marcación de
tiempo parcial no obligue a tocar la UI.

### GAP 3 — El campo `horas` tenía dos significados opuestos · RESUELTO

Era la deuda más peligrosa. Para todos los códigos, `TareoDetalle.horas` significa *horas
trabajadas* y alimenta el cálculo de horas extras vía `resolverHorasDia()`. Para `T` iba a
significar *horas de tardanza* — exactamente lo contrario. Marcar `T` con `0.5` quería decir a la
vez "media hora tarde" y "jornada de media hora".

Se resolvió con **columna dedicada**: `tareo_detalles.minutos_no_laborados INTEGER NOT NULL
DEFAULT 0` (migración `20260820180000_minutos_no_laborados_tareo`). Cada campo conserva un único
significado y `resolverHorasDia()` no se tocó.

Minutos enteros y no decimales de hora, porque el descuento se calcula minuto a minuto y así la
unidad de medida no arrastra ruido de punto flotante.

### GAP 4 — La boleta no desglosaba el descuento · RESUELTO

`boleta-pdf.ts` ahora imprime las líneas `TARDANZAS` y `PERMISOS` junto a `FALTAS` y
`DESC. DOMINICAL`. Sin ellas el neto bajaba sin el concepto que lo explicara, que es lo primero que
observa una inspección de SUNAFIL.

---

## 4. Reglas de negocio implementadas

- **El día devenga completo.** La tardanza no saca el día de la base: el trabajador asistió. El
  haber se paga entero y el descuento sale por su columna.
- **No recorta el dominical.** El D.L. 713 art. 4 prorratea el descanso semanal por *días
  efectivamente trabajados*, y quien llega tarde trabajó ese día. Fijado como test de regresión en
  `descuento-dominical.spec.ts`.
- **Marcar sin minutos no inventa descuentos.** Un día marcado `T` sin minutos declarados descuenta
  cero, no la jornada entera.
- **Cambiar de código limpia los minutos.** Volver a marcar un día pone `minutos_no_laborados` en 0,
  para que no quede un descuento fantasma heredado de la marcación anterior.
- **Permiso parcial vs. de día completo.** `P` con minutos descuenta solo esos minutos; `P` sin
  minutos sigue descontando el día entero, como antes de este cambio. Retrocompatible.
- **Tope de 480 minutos.** Más que una jornada completa ya no es tardanza sino inasistencia, y esa
  se registra con su propio código. Validado en el DTO y en la UI.

---

## 5. Límite legal

Descontar por tardanza **es legal**: se deja de pagar tiempo que no se devengó, no se sanciona al
trabajador. Lo que **no es legal** es cobrar más que ese tiempo. Un redondeo hacia arriba, un mínimo
de media hora o cualquier recargo convierten el descuento en una multa económica, y esas están
prohibidas.

Por eso el cálculo es minuto a minuto exacto, con un solo redondeo al final, y por eso el spec fija
el invariante en vez de dejarlo librado al criterio de quien toque el código después.

---

## 6. Archivos

**Base de datos**
- `backend/prisma/schema.prisma` — columna `minutos_no_laborados` en `TareoDetalle`
- `backend/prisma/migrations/20260820180000_minutos_no_laborados_tareo/migration.sql`
- `backend/prisma/seed-tipos-marcacion.ts` — códigos `T` y `P`

**Dominio**
- `dominio/detalle/tipos-detalle.ts` — `DiaTareoDetalle.minutosNoLaborados`
- `dominio/detalle/clasificar-dias-tareo.ts` — `minutosTardanza`, `minutosPermiso`, saneo de valores
- `dominio/detalle/calcular-detalle-completo.ts` — valor minuto sin redondeo intermedio, permisos parciales

**Aplicación y API**
- `aplicacion/mapear-entrada-detalle.ts` — el dato cruza desde Prisma al dominio
- `tareo/dto/update-tareo-detalle.dto.ts` y `tareo/dto/bulk-update-tareo.dto.ts` — validación 0–480
- `tareo/tareo-edicion.service.ts` — persistencia individual y masiva
- `tareo/tareo-grilla.service.ts` — expone los minutos a la grilla
- `boletas/boleta-pdf.ts` — líneas `TARDANZAS` y `PERMISOS`

**Frontend**
- `types/tareo.ts` — `minutos_no_laborados` en el día de la grilla
- `operaciones/tareo/[periodoId]/useTareoDetalle.ts` — `pideMinutos()`, payload y estado
- `operaciones/tareo/[periodoId]/components/TareoGrilla.tsx` — paso de minutos en el popover

**Tests**
- `aplicacion/descuento-por-horas-flujo.spec.ts` — 15 casos de flujo completo (nuevo)
- `dominio/detalle/clasificar-dias-tareo.spec.ts` — 10 casos de clasificación
- `dominio/detalle/descuento-dominical.spec.ts` — regresión: tardanzas y permisos no recortan

---

## 7. Verificación

```
backend   tsc --noEmit    limpio
backend   eslint          limpio
backend   jest            79 suites · 667 tests · 7 golden snapshots
frontend  tsc --noEmit    limpio
frontend  eslint          limpio
```

Los golden snapshots pasan sin cambios, incluido el de Benites Malpica: **ninguna planilla ya
emitida cambia de resultado**. El descuento aparece solo cuando alguien marca `T` o `P` con minutos,
y esos códigos no existían antes.

---

## 8. Pendiente

**Definición del contador.** El criterio implementado es que un permiso parcial sin goce **no**
recorta el dominical, por el mismo razonamiento que la tardanza: el día se trabajó, aunque
parcialmente. Está marcado como asunción en `descuento-por-horas-flujo.spec.ts`. Si el contador
define lo contrario, el cambio es agregar `P` a `CODIGOS_AUSENCIA_SIN_GOCE` en
`descuento-dominical.ts` y ajustar ese test.

**Reglamento interno.** Confirmar si la empresa tiene alguna regla propia sobre tardanzas. Legalmente
no corresponde tope ni mínimo más allá del tiempo real no laborado, pero conviene verificarlo antes
de que el módulo se use en producción.

**Permisos por rol.** Los códigos `T` y `P` quedan disponibles para todo usuario que ya pueda editar
el tareo. Si se quiere restringir quién registra tiempo descontable, hay que agregar el permiso
correspondiente.
