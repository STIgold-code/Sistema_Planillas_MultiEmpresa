/**
 * Prueba de comportamiento INTENCIONAL: la asignación familiar se paga según el
 * dato real `empleado.asignacion_familiar` (10% RMV por ley ≈ S/113), NO fija en 0.
 *
 * Corrige un subpago heredado del legacy, que la fijaba en 0 para TODOS los
 * trabajadores en ambos caminos de cálculo:
 *  - Camino MENSUAL: `mapearEntradaCalculo` + factory de régimen + `calcularBoleta`.
 *  - Camino DETALLE: `mapearEntradaDetalle` + `calcularDetalleCompleto` (oráculo).
 *
 * Ambos caminos comparten ahora la MISMA fuente (`empleado.asignacion_familiar`)
 * y pagan el mismo monto (parámetro legal) cuando el trabajador tiene derecho.
 */
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { CLAVE_ASIGNACION_FAMILIAR } from '../dominio/conceptos/asignacion-familiar';
import { mapearEntradaCalculo, EmpleadoParaMapeo } from './mapear-entrada-calculo';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';

const params = new ParametrosLegalesEnMemoria();

// Monto legal vigente del parámetro (10% RMV). Se lee del mismo parámetro que usa
// el dominio para no acoplar el test a una constante duplicada.
const MONTO_ASIG_FAMILIAR = params.asignacionFamiliar(new Date(2026, 3, 0));

const tipoMarcacion = {
  es_laborable: true,
  horas_diurnas: 8,
  horas_nocturnas: 0,
  horas_default: 8,
};

function empleadoMensual(asignacionFamiliar: boolean): EmpleadoParaMapeo {
  return {
    sueldo_base: 3000,
    asignacion_familiar: asignacionFamiliar,
    regimen_pensionario: {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
    },
    contratos: [{ regimen_laboral: null }],
    tareos: [
      {
        detalles: Array.from({ length: 30 }, () => ({
          horas: 8,
          tipo_marcacion: { ...tipoMarcacion },
        })),
      },
    ],
  };
}

function empleadoDetalle(asignacionFamiliar: boolean): EmpleadoParaDetalle {
  return {
    sueldo_base: 3000,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: asignacionFamiliar,
    sctr: false,
    regimen_pensionario: {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
    },
    contratos: [{ fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null }],
    tareos: [
      {
        detalles: Array.from({ length: 30 }, () => ({
          horas: 8,
          tipo_marcacion: {
            codigo: 'A',
            es_laborable: true,
            es_feriado_trabajado: false,
            horas_diurnas: 8,
            horas_nocturnas: 0,
            horas_default: 8,
          },
        })),
      },
    ],
  };
}

function detalleConAsignacion(asignacionFamiliar: boolean) {
  const entrada = mapearEntradaDetalle({
    empleado: empleadoDetalle(asignacionFamiliar),
    mes: 3,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
  return calcularDetalleCompleto(entrada, params);
}

const montoAsignacion = (conceptos: { clave: string; monto: number }[]): number =>
  conceptos
    .filter((c) => c.clave === CLAVE_ASIGNACION_FAMILIAR)
    .reduce((a, c) => a + c.monto, 0);

describe('Asignación familiar — pago según empleado.asignacion_familiar', () => {
  it('verifica que el parámetro legal es ~S/113 (10% RMV)', () => {
    expect(MONTO_ASIG_FAMILIAR).toBeGreaterThan(0);
    expect(MONTO_ASIG_FAMILIAR).toBeCloseTo(113, 0);
  });

  describe('Camino MENSUAL (mapper + factory + calcularBoleta)', () => {
    it('paga la asignación familiar cuando asignacion_familiar = true', () => {
      const entrada = mapearEntradaCalculo({
        empleado: empleadoMensual(true),
        empresa: { regimen_laboral_default: 'GENERAL' },
        mes: 3,
        anio: 2026,
      });
      const boleta = calcularBoleta(
        entrada,
        crearCalculadoraRegimen(entrada.regimenLaboral),
        params,
      );
      expect(montoAsignacion(boleta.conceptos)).toBe(MONTO_ASIG_FAMILIAR);
    });

    it('NO paga la asignación familiar cuando asignacion_familiar = false', () => {
      const entrada = mapearEntradaCalculo({
        empleado: empleadoMensual(false),
        empresa: { regimen_laboral_default: 'GENERAL' },
        mes: 3,
        anio: 2026,
      });
      const boleta = calcularBoleta(
        entrada,
        crearCalculadoraRegimen(entrada.regimenLaboral),
        params,
      );
      expect(montoAsignacion(boleta.conceptos)).toBe(0);
    });
  });

  describe('Camino DETALLE (mapper + calcularDetalleCompleto)', () => {
    it('paga la asignación familiar cuando asignacion_familiar = true', () => {
      const detalle = detalleConAsignacion(true);
      expect(detalle.asignacion_familiar).toBe(MONTO_ASIG_FAMILIAR);
    });

    it('NO paga la asignación familiar cuando asignacion_familiar = false', () => {
      const detalle = detalleConAsignacion(false);
      expect(detalle.asignacion_familiar).toBe(0);
    });
  });
});
