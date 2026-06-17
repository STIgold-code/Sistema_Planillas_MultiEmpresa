/**
 * Golden / parity net for the legacy GENERAL-régimen engine (SDD T01).
 *
 * Purpose: freeze the CURRENT output of the procedural `calcularEmpleado`
 * engine for representative GENERAL employees. These Jest snapshots are the
 * regression contract the new régimen-parameterized engine must reproduce
 * exactly (T14) before the legacy path is retired.
 *
 * These tests assert NOTHING about whether the legacy numbers are "correct" by
 * law — they capture behavior as-is. Any change to the engine output is a
 * deliberate decision that must update these snapshots consciously.
 */
import { calcularEmpleado } from './calcular-empleado';
import { ESCENARIOS_GENERAL } from './__fixtures__/empleados-general.fixture';

describe('calcularEmpleado - golden/parity net (GENERAL)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'snapshot estable: %s',
    (_nombre, escenario) => {
      const resultado = calcularEmpleado(
        escenario.empleado,
        escenario.mes,
        escenario.anio,
        escenario.acumuladoRemuneracion,
        escenario.acumuladoRetenciones,
      );

      expect(resultado).toMatchSnapshot();
    },
  );

  it('es determinista: misma entrada produce misma salida', () => {
    const escenario = ESCENARIOS_GENERAL[0];
    const primera = calcularEmpleado(
      escenario.empleado,
      escenario.mes,
      escenario.anio,
      escenario.acumuladoRemuneracion,
      escenario.acumuladoRetenciones,
    );
    const segunda = calcularEmpleado(
      escenario.empleado,
      escenario.mes,
      escenario.anio,
      escenario.acumuladoRemuneracion,
      escenario.acumuladoRetenciones,
    );

    expect(segunda).toEqual(primera);
  });

  it('cubre conceptos representativos: ingresos, descuentos y aportes', () => {
    // Smoke assertions guarding the snapshot scope: the captured photo must
    // exercise sueldo base, pension deductions and employer contributions.
    const [escenarioOnp] = ESCENARIOS_GENERAL;
    const resultado = calcularEmpleado(
      escenarioOnp.empleado,
      escenarioOnp.mes,
      escenarioOnp.anio,
      escenarioOnp.acumuladoRemuneracion,
      escenarioOnp.acumuladoRetenciones,
    );

    expect(resultado.sueldo_base).toBeGreaterThan(0);
    expect(resultado.onp).toBeGreaterThan(0);
    expect(resultado.essalud_empleador).toBeGreaterThan(0);
    expect(resultado.total_ingresos).toBeGreaterThan(0);
    expect(resultado.neto_pagar).toBeLessThanOrEqual(resultado.total_ingresos);
  });
});
