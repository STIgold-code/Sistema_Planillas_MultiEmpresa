# ESTADO — Sistema de Planillas MultiEmpresa

> Última actualización: 2026-08-07. Rama principal: `main`.

## Resumen ejecutivo

El producto está en **operación real con el primer cliente (Grupo BM)**: planillas de
enero a julio 2026 calculadas en producción, julio aprobado con boletas emitidas,
dos liquidaciones de cese procesadas, y el ciclo de agosto listo para correr con
la nueva ventana de corte. Las 6 fases técnicas originales siguen completas; sobre
ellas se construyó la capa de operación (PRs #50–#61, agosto 2026).

**Estado de calidad:** 0 usos de `any`, ESLint limpio, `tsc --noEmit` limpio en
backend y frontend, CI bloqueante en cada PR. Tests backend: **526 passed,
7 skipped** (los 5 puntos legales sin confirmar + 2 relacionados). Golden master
de paridad intacto.

## Capacidades agregadas (PRs #50–#61, ago 2026)

| Capacidad | Detalle | PRs |
|-----------|---------|-----|
| Auditoría multiempresa cerrada | 24 hallazgos en 3 fases: seguridad P0 (IDOR contratos/documentos, backups sin permisos, mass assignment), identidad de contexto (dashboard/header/sidebar/Excel con la empresa ACTIVA), coherencia de sesión (header `X-Empresa-Activa` centralizado en `lib/api.ts`, empresa activa limpiada en login/logout, sync entre pestañas) | #52–#54 |
| Ventana de corte por empresa | `Empresa.dia_corte_tareo` (BM=25): período del mes M = 26 del M-1 → 25 del M. `TareoDetalle.dia` es ordinal (1..N); la ventana SIEMPRE se lee de `fecha_inicio/fecha_fin` persistidas. Regla transversal en tareo, planillas, vacaciones, alertas, reportes y Excel | #55, #56 |
| Destaques a mina | Catálogo `MINA` (12h diurnas → 2h@25% + 2h@35% automáticas), `MINA-F` (feriado trabajado) y `DT` (descanso trabajado). Política validada con el PO: 8h + 4 extras fijas, diurno | #57 |
| Gratificación corregida | Computable de grati y CTS con asignación familiar (Ley 25129); totales de edición por fila alineados con el cálculo completo; PDF de boleta sin renglones superpuestos | #58 |
| Boletas con identidad | Logo real de la empresa y firma del representante en el PDF (desde `Configuracion > Datos de Empresa`); descarga masiva ordenable por apellido o código | #59 |
| Módulo de préstamos y adelantos | Entidades `Prestamo`/`PrestamoMovimiento` con saldo e historial auditable; el cálculo descuenta cuotas automáticamente (adelanto de grati solo en jul/dic; última cuota acotada al saldo); amortización idempotente al aprobar y reversión al anular. Página `/planilla/prestamos` | #60, #61 |
| Beneficios truncos operativos | Liquidaciones de cese calculadas por el motor (CTS/grati/vacaciones truncas, columnas propias). Ceses de MEDINA (09/06) y G. Guerrero (31/07) procesados en prod | — (motor existente) |
| Scroll superior + leyenda tareo | Barra espejo en tabla de planilla (`TablaConScrollSuperior`); catálogo de marcaciones con colores (leyenda y grilla) | #50, #51 |

## Datos en producción (Railway)

- Empresa BM (id 10): 16 empleados, tareos dic-2025→jul-2026, planillas ene→jul
  calculadas (julio APROBADA con 16 boletas). 9 préstamos recurrentes activos en
  el módulo (cuota mensual = quincenal × 2, del correo de cierre 07-2026).
- Convención de asistencia: mes comercial de 30 días; todo día pagado = A
  (domingos y feriados no trabajados incluidos). Mapeo del Excel documentado en
  memoria del proyecto.

## Pendiente

### Operativo (muerde pronto)
- **Permisos `prestamos:*` sin asignar a roles**: hasta asignarlos en
  `/configuracion/roles`, solo el superadmin ve el módulo de préstamos.
- **Sueldo de J. Sánchez a S/2,000** (correo del cliente): sin vigencia
  confirmada (¿julio o agosto?). No aplicado.
- **Migraciones por entorno**: prod al día (el backend corre `migrate deploy`);
  en BD locales aplicar `20260807120000_prestamos_adelantos` (y la de SUCAMEC
  si nunca se corrió).

### Validaciones del contador (antes del cierre 25-ago)
- Los **5 puntos legales** de Agrario/Construcción civil (`it.skip`) — sin cambio.
- **Grati trunca**: la fórmula (paridad legacy) cuenta el mes del cese como sexto
  completo (MEDINA: 6/6). Confirmar criterio.
- **Mina**: equivalencia del banco de compensación (¿1:1 o con recargo?) y asiento
  de domingo/feriado trabajado contra una planilla real.
- **Excel de julio cerrado**: los días 26-31/07 (ventana de agosto) y el criterio
  EXAMEN MEDICO→LCG.

### Deuda técnica priorizada
- Documento de **liquidación de cese** (los beneficios truncos se calculan pero
  la boleta no los imprime; van en columnas aparte del neto).
- Fase 2 de mina: flujo de aprobación de sobretiempo + banco de horas.
- Logo ERMIR estático aún en 3 exports (Excel general, requerimientos, tareo).
- Transición formal APROBADA→CALCULADA ("desaprobar") con auditoría.
- `calcularDiasCesadoNoLab`: la rama con contrato ignora `fecha_cese` en
  indefinidos (el fallback por empleado salva).
- Catálogo de marcaciones (11 en BD) vs ~25 códigos que el motor entiende;
  el devengue vive hardcodeado en `CODIGOS_NO_LABORABLES`.
- Boleta: "REG. PENSIÓN: ONP ONP" (duplica tipo y nombre);
  `rem_computable_vacaciones` sin asignación familiar (informativo).
- P2 de la auditoría multiempresa: catálogo Banco global con CRUD abierto,
  títulos de pestaña, breadcrumbs, `OR` de auditoría.
- **Sentry**: proyecto nuevo para este producto (no reusar el de ERMIR).

## Cómo correr

```bash
cd backend && npm install && npx prisma generate
npx prisma migrate deploy        # aplica migraciones a la BD
npm test                         # 526 passed, 7 skipped
npm run start:dev                # puerto 4001
```

> Nota de entorno: `node` no está en el PATH del sistema; hay un node funcional embebido en
> Visual Studio (`...\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe`).
