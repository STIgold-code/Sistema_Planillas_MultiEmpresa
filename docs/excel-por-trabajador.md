# Excel por trabajador

**Estado:** implementado (21 de agosto de 2026).
**Botón:** Planilla → *Excel por trabajador*. Endpoint: `GET /planillas/:id/exportar-trabajadores`.

---

## 1. Qué es y para quién

Un libro con **una hoja por trabajador** donde cada sol del neto se puede seguir hasta el día del
tareo, la tasa legal, el préstamo o la planilla anterior que lo originó. Es la vista que pide un
gerente o un inspector: *"¿por qué esta persona cobró lo que cobró?"*.

Hay tres formas de mirar una planilla y cada una responde una pregunta distinta:

| Orientación | Pregunta | Exportación |
|---|---|---|
| Matriz (filas = trabajadores, columnas = conceptos) | ¿Cuánto suma la planilla? | *Exportar auditable* |
| Por concepto | ¿Cómo se calcula la renta de 5.ª? | hoja *Cómo se calcula* |
| **Por trabajador** | **¿Por qué Juan cobró lo que cobró?** | **Excel por trabajador** |

## 2. La regla de oro

Heredada del export auditable y no negociable: **una fórmula solo se escribe si reproduce el
importe que calculó el sistema**. Antes de escribirla, el modelo calcula en JavaScript lo que la
fórmula debería dar y lo compara con el DTO; si difieren en más de un céntimo, la celda conserva el
valor del sistema y queda en rojo con una nota que dice cuánto habría dado la fórmula.

Nunca se entrega una hoja que contradiga la planilla. Y nunca se oculta una diferencia.

## 3. Estructura de cada hoja

Columnas del libro mayor: **B** etiqueta · **C** cantidad/base · **D** factor/tasa · **E** importe
(fórmula) · **F** importe según el sistema · **G** diferencia · **H..L** de dónde sale.

1. **Resultado** — primera fila útil: neto del sistema, neto según las fórmulas, diferencia y
   cuántas celdas quedaron en rojo. Si la diferencia es 0.00, la hoja cierra.
2. **Datos del trabajador y del período** — cargo, régimen pensionario, condición fiscal, sueldo
   básico (editable, ámbar), valor día, valor hora, valor minuto.
3. **Antecedentes** — planillas previas del trabajador: las del mismo ejercicio alimentan el
   acumulado de renta; las de los seis meses previos, los promedios de gratificación y CTS.
4. **Tareo día por día** — el único dato de entrada. Fecha real, código, horas, y dos banderas
   derivadas **con la misma regla del motor**: *devenga* y *sin goce*. Las horas extras se
   calculan por fórmula sobre los días que devengan.
5. **Ingresos afectos / no afectos** — cada línea referencia al tareo y a los parámetros.
6. **Descuentos que nacen del tareo** — faltas (siempre 0.00, con la explicación), dominical
   semana por semana en sextos, tardanzas minuto a minuto, permisos.
7. **Descuentos de ley** — ONP o AFP con las tasas de la hoja *Parámetros*; renta de 5.ª en
   14 pasos numerados, con el acumulado leído de los antecedentes por `SUMIFS`.
8. **Préstamos y adelantos** — cargos registrados contra la planilla o, si aún no está aprobada,
   los préstamos activos de los que el cálculo tomó la cuota.
9. **Resultado** — total descuentos, neto.
10. **Aportes del empleador** — EsSalud, SCTR, Vida Ley, SENATI.

El índice enlaza a cada hoja y compara todos los netos; la hoja *Parámetros* ahora incluye la
escala del impuesto a la renta con la tasa diferencial de cada tramo.

### Resúmenes transversales

Dos hojas responden la pregunta "¿cuánto y a quién?" sin abrir 16 pestañas:

- **Resumen Renta 5ta** — una fila por trabajador con los pasos clave (acumulado, proyección,
  renta neta, impuesto, cuota, adicional, retención) y el valor del sistema al lado.
- **Resumen Dominical** — días que devengan, ausencias sin goce, sextos perdidos, descuento.

Ninguna celda recalcula nada: cada importe es una **referencia a la hoja del trabajador**
(`'3. PÉREZ JUAN'!$E$87`). Si alguien cambia el sueldo en la hoja de una persona, el resumen se
actualiza solo. Una sola fuente de verdad. Validado en Excel real: renta S/ 422.17 y dominical
S/ 132.22, iguales al sistema, diferencia 0.00 en todas las filas.

## 4. Decisiones de diseño

**El backend solo lee y ordena; no recalcula.** `planilla-exportacion-trabajadores.ts` extiende el
DTO de `exportar` con el tareo (clasificado con `diaDevenga` y `CODIGOS_AUSENCIA_SIN_GOCE` del
dominio), los acumulados de renta (misma consulta que `cargarAcumuladosIR`), los cargos de
préstamos y el historial. La verificación vive en el Excel.

**El modelo de la hoja es puro.** `planilla-trabajador-modelo.ts` y `planilla-trabajador-conceptos.ts`
no tocan ExcelJS, DOM ni red: arman filas con fórmulas y valores esperados. Por eso se pudieron
validar contra producción desde un script antes de tocar la interfaz.

**Las hojas compartidas salieron a `planilla-auditable-hojas.ts`** (Parámetros, Cómo se calcula,
leyenda de colores). El export auditable y el export por trabajador las consumen; ninguno depende
del otro.

**Préstamos.** El cálculo lee los préstamos *activos*; los movimientos se registran al aprobar. Con
la planilla en CALCULADA no hay cargos, así que la exportación cae a la misma fuente que el motor
(`cuotaEfectiva`, `descuentaEnMes`). Limitación honesta: se lee el estado de hoy; si un préstamo se
canceló después del cálculo, la hoja marca la divergencia en vez de inventarla.

**EsSalud sin tareo.** Un trabajador sin tareo sale por el atajo `detalleSinTareo` con todo en cero;
la fórmula lo respeta.

## 5. Validación contra producción

Se ejecutó la exportación contra la planilla real de julio 2026 (16 trabajadores), se construyó el
libro con los mismos módulos del frontend y se abrió en Excel real:

```
16 / 16 hojas: neto según fórmulas = neto del sistema (diferencia 0.00)
0 errores de fórmula en 18 hojas
7 celdas divergentes, todas explicadas (ver §6)
```

## 6. Hallazgo: `haber_mensual` viene de otro motor que el neto

Dos trabajadores con vacaciones o descanso médico en el período muestran `haber_mensual` en rojo:

- El DTO toma `haber_mensual` del **motor de régimen** (`mapear-resultado-detalle.ts:199`), cuyo
  criterio de *asistió* es `es_laborable && !sin_goce`: cuenta como pagados los días de
  vacaciones, descanso médico y subsidio.
- El **motor de detalle** no los incluye en el haber (`diaDevenga`) y los paga en líneas propias
  (remuneración vacacional, descanso médico). El neto y `total_ingresos_afectos` salen de este
  motor.

Resultado: para esos trabajadores, `haber_mensual` + las líneas separadas **no suman**
`total_ingresos_afectos`. El neto es correcto; lo inconsistente es la columna mostrada. La ONP y
EsSalud de uno de ellos también se calcularon sobre la base del régimen (que incluye la
remuneración vacacional, afecta a pensión), distinta de `rem_afecta`.

No es un defecto de esta exportación —el export auditable del PR #81 lo marca igual— y no se
corrigió aquí porque es una decisión del diseño de los dos motores. Queda registrado para decidirlo.

## 7. Archivos

**Backend**
- `planillas/planilla-exportacion-trabajadores.ts` (+ spec) — trazabilidad por trabajador
- `planillas/planilla-parametros-exportacion.ts` — escala del IR y deducción en el bloque de parámetros
- `planillas/dominio/detalle/clasificar-dias-tareo.ts` — `diaDevenga` y `resolverHorasDia` exportados
- `planillas/dominio/conceptos/renta-quinta.ts` — `DEDUCCION_UIT` exportado
- `planillas/planillas.controller.ts` · `planillas.service.ts` · `planilla-consulta.service.ts` — endpoint

**Frontend** (`app/(dashboard)/planilla/[id]/`)
- `planilla-auditable-hojas.ts` — hojas y estilos compartidos (extraídos del export auditable)
- `planilla-trabajador-modelo.ts` — constructor de filas, tareo, antecedentes (puro)
- `planilla-trabajador-conceptos.ts` — ingresos, descuentos, renta, préstamos, totales (puro)
- `planilla-trabajador-hoja.ts` — render con ExcelJS
- `planilla-trabajador-resumen.ts` — hojas Resumen Renta 5ta y Resumen Dominical (referencias entre hojas)
- `planilla-export-trabajadores.ts` — orquestación, índice y descarga
- `planilla-export-tipos.ts` — contrato del endpoint
- `usePlanillaDetalle.ts` · `page.tsx` · `components/PlanillaHeader.tsx` — botón
