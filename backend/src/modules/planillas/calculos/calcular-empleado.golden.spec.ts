/**
 * Golden / regression net for the GENERAL régimen (SDD).
 *
 * Originally these snapshots froze the legacy procedural engine
 * `calcularEmpleado`. The legacy engine has been RETIRED: the pure domain engine
 * `calcularDetalleCompleto` (via the aplicación edge mapper) now produces the
 * full DTO and was proven equal to the legacy AL CÉNTIMO field-by-field
 * (`dominio/detalle/paridad-detalle-completo.spec.ts`) BEFORE deletion.
 *
 * The snapshot file is therefore the SERIALIZED CONTRACT: it must keep matching
 * the new engine byte-for-byte. The describe/test titles are intentionally
 * unchanged so the existing `__snapshots__` keys (the regression contract) stay
 * valid — any drift in the new engine output fails here.
 */
import {
  ESCENARIOS_GENERAL,
  calcularDetalleOraculo,
} from './__fixtures__/empleados-general.fixture';

describe('calcularEmpleado - golden/parity net (GENERAL)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'snapshot estable: %s',
    (_nombre, escenario) => {
      expect(calcularDetalleOraculo(escenario)).toMatchSnapshot();
    },
  );

  it('es determinista: misma entrada produce misma salida', () => {
    const escenario = ESCENARIOS_GENERAL[0];
    expect(calcularDetalleOraculo(escenario)).toEqual(
      calcularDetalleOraculo(escenario),
    );
  });

  it('cubre conceptos representativos: ingresos, descuentos y aportes', () => {
    const [escenarioOnp] = ESCENARIOS_GENERAL;
    const resultado = calcularDetalleOraculo(escenarioOnp);

    expect(resultado.sueldo_base).toBeGreaterThan(0);
    expect(resultado.onp).toBeGreaterThan(0);
    expect(resultado.essalud_empleador).toBeGreaterThan(0);
    expect(resultado.total_ingresos).toBeGreaterThan(0);
    expect(resultado.neto_pagar).toBeLessThanOrEqual(resultado.total_ingresos);
  });
});
