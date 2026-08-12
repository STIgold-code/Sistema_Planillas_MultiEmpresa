/**
 * Flujo REAL (`calcularDetalleEmpleado`) de la bonificación extraordinaria de la
 * Ley 30334 dentro de la retención de renta de 5.ª.
 *
 * DEFECTO QUE ESTOS TESTS FIJAN (comparativo BENITES MALPICA, gap C5, S/ 63.00):
 * la gratificación está inafecta a EsSalud/ONP/AFP (Ley 30334) y por eso el
 * motor la mandaba, junto con su bonificación del 9%, a los ingresos NO afectos.
 * Pero esa inafectación alcanza SOLO a las contribuciones sociales: ambas siguen
 * siendo renta de quinta categoría gravable. La gratificación ya entraba por la
 * proyección anual (D.S. 122-94-EF art. 40 inc. a: 12 sueldos + 2 gratificaciones);
 * la bonificación del 9% quedaba FUERA de toda base y no se retenía nada por ella.
 *
 * REGLA (D.S. 122-94-EF art. 40 inc. e): los ingresos EXTRAORDINARIOS puestos a
 * disposición en el mes no se proyectan — se suman a la renta del ejercicio y el
 * impuesto adicional que generan se retiene ÍNTEGRO en el mes en que se perciben.
 *
 * CASO REPRODUCTOR (fila real BENITES MALPICA RAUL, julio 2026): sueldo 5 000,
 * sin asignación familiar ni sistema pensionario. Retiene 230.00 de enero a
 * junio; en julio cobra 5 000 de gratificación + 450 de bonificación 30334 y
 * debe retener 293.00 (230.00 + 450 × 14%, su tasa marginal). La contadora
 * retuvo exactamente eso; el motor se quedaba en 230.00.
 */
import {
  calcularDetalleEmpleado,
  ParametrosCalculoDetalle,
} from './calcular-detalle-empleado';
import {
  ParametrosLegalesEnMemoria,
  ValorVigente,
} from '../infraestructura/parametros-legales-en-memoria';
import { TramoIR } from '../dominio/tipos';
import { EmpleadoParaMapeo } from './mapear-entrada-calculo';
import { EmpleadoParaDetalle } from './mapear-entrada-detalle';
import {
  construirEmpleadoBm,
  mesCompleto30Dias,
} from '../calculos/__fixtures__/benites-malpica.fixture';

const uno = <T>(valor: T): ValorVigente<T>[] => [
  { valor, vigenciaDesde: new Date('2000-01-01') },
];

const TRAMOS: TramoIR[] = [
  { hasta: 5, tasa: 0.08 },
  { hasta: 20, tasa: 0.14 },
  { hasta: 35, tasa: 0.17 },
  { hasta: 45, tasa: 0.2 },
  { hasta: Infinity, tasa: 0.3 },
];

/** Mismos parámetros que la planilla real de BM (UIT 5 500, EsSalud 9%). */
const parametros = new ParametrosLegalesEnMemoria({
  rmv: uno(1130),
  uit: uno(5500),
  asignacionFamiliar: uno(113),
  essaludTasa: uno(0.09),
  essaludMinimo: uno(101.7),
  sisMicroempresa: uno(15),
  tramosIR: uno(TRAMOS),
  sctrSalud: uno(0.015),
  sctrPension: uno(0.02),
  vidaLeyTasa: uno(0.0053),
  senatiTasa: uno(0.0075),
});

const SUELDO = 5000;
const RETENCION_ORDINARIA = 230;
const BONIFICACION_30334 = 450; // 9% de la gratificación de 5 000
const TASA_MARGINAL = 0.14;

const redondear2 = (v: number) => Math.round(v * 100) / 100;
const num = (v: unknown) => Number(v);

/** RAUL en el mes pedido, con los acumulados de renta que trae del año. */
function calcular(mes: number, mesesPrevios: number) {
  const empleado = construirEmpleadoBm({
    sueldoBase: SUELDO,
    regimenPensionario: null,
    detalles: mesCompleto30Dias(),
    sctr: true,
  });
  return calcularDetalleEmpleado({
    empleado: empleado as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle,
    empresa: { regimen_laboral_default: 'GENERAL' },
    mes,
    anio: 2026,
    acumuladoRenta: SUELDO * mesesPrevios,
    retencionesPreviasRenta: RETENCION_ORDINARIA * mesesPrevios,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros,
  } as ParametrosCalculoDetalle);
}

describe('bonificación 30334 en la renta de 5.ª — mes SIN gratificación (mayo)', () => {
  const dto = calcular(5, 4);

  it('no paga gratificación ni bonificación', () => {
    expect(num(dto.gratificacion_monto)).toBe(0);
    expect(num(dto.gratificacion_ingreso)).toBe(0);
  });

  it('retiene solo la cuota ordinaria de la proyección anual', () => {
    // (5 000 × 14 − 7 × 5 500) = 31 500 → 2 760/año ÷ 12 = 230.00
    expect(num(dto.renta_5ta)).toBe(RETENCION_ORDINARIA);
  });
});

describe('bonificación 30334 en la renta de 5.ª — mes CON gratificación (julio)', () => {
  const dto = calcular(7, 6);

  it('paga la gratificación íntegra y su bonificación extraordinaria del 9%', () => {
    expect(num(dto.gratificacion_monto)).toBe(SUELDO);
    expect(num(dto.gratificacion_ingreso)).toBe(SUELDO + BONIFICACION_30334);
  });

  it('la gratificación y la bonificación siguen INAFECTAS a EsSalud y pensión', () => {
    // Ley 30334: la inafectación alcanza a las contribuciones, no al impuesto.
    expect(num(dto.remuneracion_afecta)).toBe(SUELDO);
    expect(num(dto.essalud_empleador)).toBe(redondear2(SUELDO * 0.09));
    expect(num(dto.total_ingresos_no_afectos)).toBe(
      SUELDO + BONIFICACION_30334,
    );
  });

  it('retiene la cuota ordinaria MÁS el impuesto de la bonificación del mes', () => {
    expect(num(dto.renta_5ta)).toBe(
      RETENCION_ORDINARIA + redondear2(BONIFICACION_30334 * TASA_MARGINAL),
    );
    expect(num(dto.renta_5ta)).toBe(293);
  });

  it('el impuesto adicional es exactamente la bonificación por su tasa marginal', () => {
    const soloOrdinaria = num(calcular(5, 4).renta_5ta);
    expect(num(dto.renta_5ta) - soloOrdinaria).toBeCloseTo(
      BONIFICACION_30334 * TASA_MARGINAL,
      2,
    );
  });

  it('la retención mayor fluye al total de ley y al neto sin recálculos paralelos', () => {
    expect(num(dto.total_descuentos_ley)).toBe(num(dto.renta_5ta));
    expect(num(dto.quinta_categoria)).toBe(num(dto.renta_5ta));
    expect(num(dto.neto_pagar)).toBe(
      redondear2(num(dto.total_ingresos) - num(dto.total_descuentos)),
    );
  });
});
