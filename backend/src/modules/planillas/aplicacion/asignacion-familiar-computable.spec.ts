/**
 * La asignación familiar INTEGRA la remuneración computable de gratificación
 * (Ley 27735) y de CTS (D.S. 001-97-TR).
 *
 * Base legal: la asignación familiar (Ley 25129) es remuneración REGULAR y
 * permanente del trabajador, por lo que forma parte de la remuneración
 * computable de los beneficios sociales. Omitirla subpaga la gratificación, la
 * bonificación extraordinaria (Ley 30334, 9% de la gratificación) y la CTS.
 *
 * Caso real reportado en producción (planilla de julio): trabajador con sueldo
 * 2700 y asignación familiar 113 recibía gratificación 2700 (sueldo pelado) en
 * lugar de 2813, y bonificación extraordinaria 243 en lugar de 253.17.
 *
 * Se ejerce el CAMINO REAL de producción (`calcularDetalleEmpleado`): motor puro
 * del DTO completo + overlay del motor de régimen, que es quien decide los
 * montos load-bearing (gratificación, bonificación 30334 y CTS).
 */
import { calcularDetalleEmpleado } from './calcular-detalle-empleado';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';

const parametros = new ParametrosLegalesEnMemoria();

const SUELDO = 2700;
const ASIGNACION_FAMILIAR = 113;

const dia8h = () => ({
  horas: 8,
  tipo_marcacion: {
    codigo: 'A',
    es_laborable: true,
    es_feriado_trabajado: false,
    horas_diurnas: 8,
    horas_nocturnas: 0,
    horas_default: 8,
  },
});

const empleado = (conAsignacion: boolean) =>
  ({
    sueldo_base: SUELDO,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: conAsignacion,
    sctr: false,
    regimen_pensionario: {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
    },
    contratos: [
      {
        fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: null,
        regimen_laboral: null,
      },
    ],
    tareos: [{ detalles: Array.from({ length: 30 }, () => dia8h()) }],
  }) as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle;

const calcular = (mes: number, conAsignacion: boolean) =>
  calcularDetalleEmpleado({
    empleado: empleado(conAsignacion),
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros,
  });

describe('Gratificación — la asignación familiar entra a la computable (Ley 27735 + Ley 25129)', () => {
  it('verifica el parámetro legal usado en el caso: asignación familiar = 113', () => {
    expect(parametros.asignacionFamiliar(new Date(2026, 6, 31))).toBe(
      ASIGNACION_FAMILIAR,
    );
  });

  it('computable de gratificación = sueldo + asignación familiar (2700 + 113)', () => {
    expect(calcular(7, true).rem_computable_gratificacion).toBe(2813);
  });

  it('la gratificación de julio se paga sobre la computable corregida', () => {
    expect(calcular(7, true).gratificacion_monto).toBe(2813);
  });

  it('la bonificación extraordinaria (9%) se calcula sobre la grati corregida', () => {
    // 2813 × 9% = 253.17 (antes: 2700 × 9% = 243).
    expect(calcular(7, true).bonif_extraordinaria).toBe(253.17);
  });

  it('sin asignación familiar la computable y la gratificación no cambian', () => {
    const dto = calcular(7, false);
    expect(dto.rem_computable_gratificacion).toBe(SUELDO);
    expect(dto.gratificacion_monto).toBe(SUELDO);
    expect(dto.bonif_extraordinaria).toBe(243);
  });

  it('el motor de régimen y el DTO completo comparten la misma computable', () => {
    const dto = calcular(7, true);
    // Semestre completo (6/6): la gratificación del motor de régimen debe ser
    // exactamente la computable que reporta el DTO.
    expect(dto.gratificacion_monto).toBe(dto.rem_computable_gratificacion);
  });
});

describe('CTS — la asignación familiar entra a la computable (D.S. 001-97-TR + Ley 25129)', () => {
  it('computable de CTS = sueldo + asignación familiar + 1/6 de gratificación', () => {
    // 2700 + 113 + (2700/6 = 450) = 3263.
    expect(calcular(5, true).rem_computable_cts).toBe(3263);
  });

  it('el depósito de mayo se calcula sobre la computable corregida', () => {
    // (3263/12) × 6 = 1631.50 (antes: (3150/12) × 6 = 1575).
    expect(calcular(5, true).cts_monto).toBe(1631.5);
  });

  it('sin asignación familiar la computable y el depósito no cambian', () => {
    const dto = calcular(5, false);
    expect(dto.rem_computable_cts).toBe(3150);
    expect(dto.cts_monto).toBe(1575);
  });
});
