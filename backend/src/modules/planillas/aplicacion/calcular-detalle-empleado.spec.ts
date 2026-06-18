/**
 * Integration parity for the real production overlay (PR6 slice 2).
 *
 * `calcularDetalleEmpleado` is the exact per-employee path the service runs:
 * mapper → factory → guardia → motor → overlay sobre el DTO auxiliar legacy.
 * This test feeds the SAME golden fixtures and asserts that the FINAL DTO's
 * load-bearing amounts (sourced from the NEW engine) equal the legacy DTO at the
 * céntimo. If the overlay or the engine drifts, this fails.
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { calcularEmpleado } from '../calculos/calcular-empleado';
import { ESCENARIOS_GENERAL } from '../calculos/__fixtures__/empleados-general.fixture';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';

const parametros = new ParametrosLegalesEnMemoria();

const CAMPOS_LOAD_BEARING = [
  'haber_mensual',
  'horas_extras_25',
  'horas_extras_35',
  'horas_extras',
  'bonificacion_nocturna',
  'gratificacion_monto',
  'cts_monto',
  'essalud_empleador',
  'afp_aporte',
  'afp_prima',
  'afp_seguro',
  'afp_comision',
  'onp',
  'renta_5ta',
] as const;

describe('calcularDetalleEmpleado — paridad del DTO real (overlay motor sobre legacy)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'los montos load-bearing del DTO final = legacy: %s',
    (_nombre, escenario) => {
      const legacy = calcularEmpleado(
        escenario.empleado,
        escenario.mes,
        escenario.anio,
        escenario.acumuladoRemuneracion,
        escenario.acumuladoRetenciones,
      );

      const dto = calcularDetalleEmpleado({
        empleado: escenario.empleado as unknown as EmpleadoParaMapeo,
        empresa: { regimen_laboral_default: 'GENERAL' },
        mes: escenario.mes,
        anio: escenario.anio,
        acumuladoRenta: escenario.acumuladoRemuneracion,
        retencionesPreviasRenta: escenario.acumuladoRetenciones,
        detalleLegacy: legacy as unknown as Record<string, unknown>,
        parametros,
      });

      for (const campo of CAMPOS_LOAD_BEARING) {
        expect(dto[campo]).toBe(legacy[campo as keyof typeof legacy]);
      }

      // bonificación extraordinaria: el motor la deriva igual que el legacy
      // (solo en meses de gratificación).
      expect(dto.bonif_extraordinaria).toBe(
        legacy.gratificacion_monto > 0 ? legacy.bonif_extraordinaria : 0,
      );

      // Los campos auxiliares NO load-bearing se conservan del legacy.
      expect(dto.vida_ley_empleador).toBe(legacy.vida_ley_empleador);
      expect(dto.rem_computable_cts).toBe(legacy.rem_computable_cts);
    },
  );
});
