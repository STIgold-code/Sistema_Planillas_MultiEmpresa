/**
 * Integration parity for the real production per-employee path.
 *
 * `calcularDetalleEmpleado` is the exact path the service runs WITHOUT the legacy
 * engine: pure full-DTO engine (`calcularDetalleCompleto`) + régimen motor overlay
 * of the load-bearing amounts. This test feeds the SAME golden fixtures and
 * asserts that the FINAL DTO equals the cent-accurate oracle
 * (`calcularDetalleOraculo`, the ex-legacy contract) on the load-bearing amounts
 * AND preserves the auxiliary fields (vida ley, computables).
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import {
  ESCENARIOS_GENERAL,
  calcularDetalleOraculo,
} from '../calculos/__fixtures__/empleados-general.fixture';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';

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

describe('calcularDetalleEmpleado — paridad del DTO real (motor puro + overlay régimen)', () => {
  it.each(ESCENARIOS_GENERAL.map((e) => [e.nombre, e] as const))(
    'los montos load-bearing del DTO final = oráculo: %s',
    (_nombre, escenario) => {
      const oraculo = calcularDetalleOraculo(escenario);

      const dto = calcularDetalleEmpleado({
        empleado: escenario.empleado as unknown as EmpleadoParaMapeo &
          EmpleadoParaDetalle,
        empresa: { regimen_laboral_default: 'GENERAL' },
        mes: escenario.mes,
        anio: escenario.anio,
        acumuladoRenta: escenario.acumuladoRemuneracion,
        retencionesPreviasRenta: escenario.acumuladoRetenciones,
        promedios: {
          promedioHorasExtras: 0,
          promedioComisiones: 0,
          promedioBonificaciones: 0,
          ultimaGratificacion: 0,
        },
        parametros,
      });

      for (const campo of CAMPOS_LOAD_BEARING) {
        expect(dto[campo]).toBe(oraculo[campo as keyof typeof oraculo]);
      }

      expect(dto.bonif_extraordinaria).toBe(
        oraculo.gratificacion_monto > 0 ? oraculo.bonif_extraordinaria : 0,
      );

      // Campos auxiliares conservados del motor puro del DTO completo.
      expect(dto.vida_ley_empleador).toBe(oraculo.vida_ley_empleador);
      expect(dto.rem_computable_cts).toBe(oraculo.rem_computable_cts);
    },
  );
});
