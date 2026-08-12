/**
 * Flujo completo del DESCUENTO DOMINICAL (D.L. 713 art. 4) desde las filas de
 * tareo hasta el DTO de planilla: `mapearEntradaDetalle` deriva la fecha REAL de
 * cada día ordinal con la ventana del período y `calcularDetalleCompleto` agrupa
 * por semana calendario.
 *
 * Cubre los dos tipos de período que existen en producción:
 *  - Período calendario (empresa sin día de corte).
 *  - Ventana 26 → 25 (empresa con día de corte 25), donde el ordinal del día NO
 *    es el día del mes y hay semanas partidas en ambos bordes.
 */
import { calcularVentanaPeriodo } from '../../tareo/ventana-periodo';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';
import { ParametrosLegalesEnMemoria } from '../infraestructura/parametros-legales-en-memoria';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';

const PARAMS = new ParametrosLegalesEnMemoria();
const SUELDO = 3000; // valor día = 100
const UN_SEXTO = 16.67;

/** Fila de tareo: ordinal `dia` dentro de la ventana + código de nomenclatura. */
function fila(dia: number, codigo = 'A') {
  const trabajado = codigo === 'A';
  return {
    dia,
    horas: trabajado ? 8 : 0,
    tipo_marcacion: {
      codigo,
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: trabajado ? 8 : 0,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Tareo de 30 días ordinales con los códigos indicados por ordinal. */
function tareo30(codigosPorOrdinal: Record<number, string> = {}) {
  return Array.from({ length: 30 }, (_, i) =>
    fila(i + 1, codigosPorOrdinal[i + 1] ?? 'A'),
  );
}

function empleado(detalles: ReturnType<typeof fila>[]): EmpleadoParaDetalle {
  return {
    sueldo_base: SUELDO,
    fecha_ingreso: new Date(Date.UTC(2020, 0, 1)),
    fecha_cese: null,
    asignacion_familiar: false,
    sctr: false,
    regimen_pensionario: null,
    contratos: [
      { fecha_inicio: new Date(Date.UTC(2020, 0, 1)), fecha_fin: null },
    ],
    tareos: [{ detalles }],
  };
}

function calcular(
  detalles: ReturnType<typeof fila>[],
  mes: number,
  anio: number,
  diaCorte: number | null,
) {
  const entrada = mapearEntradaDetalle({
    empleado: empleado(detalles),
    mes,
    anio,
    ventanaPeriodo: calcularVentanaPeriodo(anio, mes, diaCorte),
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
  });
  return calcularDetalleCompleto(entrada, PARAMS);
}

describe('descuento dominical — período CALENDARIO (junio 2026, 01-jun es lunes)', () => {
  it('REGRESIÓN: sin faltas no descuenta ni un céntimo', () => {
    const dto = calcular(tareo30(), 6, 2026, null);
    expect(dto.descuento_dominical).toBe(0);
    expect(dto.total_descuentos_otros).toBe(0);
  });

  it('una falta el miércoles 03-jun recorta un sexto del dominical', () => {
    const dto = calcular(tareo30({ 3: 'F' }), 6, 2026, null);
    expect(dto.descuento_dominical).toBe(UN_SEXTO);
    expect(dto.dias_falta).toBe(1);
    // La falta ya no devenga su día (haber = 3000/30 × 29) y ADEMÁS recorta el
    // dominical de esa semana. Son dos efectos distintos, no un doble castigo.
    expect(dto.haber_mensual).toBe(2900);
    expect(dto.descuento_faltas).toBe(0);
  });

  it('dos faltas en la misma semana recortan dos sextos', () => {
    const dto = calcular(tareo30({ 3: 'F', 5: 'F' }), 6, 2026, null);
    expect(dto.descuento_dominical).toBe(33.33);
  });

  it('la falta con subsidio en la misma semana solo recorta por la falta', () => {
    const dto = calcular(tareo30({ 3: 'F', 4: 'DM' }), 6, 2026, null);
    expect(dto.descuento_dominical).toBe(UN_SEXTO);
  });

  it('entra a los totales de descuentos y al neto', () => {
    const dto = calcular(tareo30({ 3: 'F' }), 6, 2026, null);
    expect(dto.total_descuentos_otros).toBe(UN_SEXTO);
    expect(dto.total_descuentos).toBe(
      Math.round((dto.total_descuentos_ley + UN_SEXTO) * 100) / 100,
    );
    expect(dto.neto_pagar).toBe(
      Math.round((dto.total_ingresos - dto.total_descuentos) * 100) / 100,
    );
  });

  it('usa el ordinal `dia` de la fila, no el orden del array', () => {
    const desordenado = [...tareo30({ 3: 'F', 5: 'F' })].reverse();
    expect(calcular(desordenado, 6, 2026, null).descuento_dominical).toBe(
      33.33,
    );
  });
});

describe('descuento dominical — ventana con día de corte 25 (26-jun → 25-jul 2026)', () => {
  it('la semana partida del borde inicial solo cuenta sus días del período', () => {
    // Ordinal 1 = viernes 26-jun. Su semana (22 al 28) entra al período solo con
    // 26, 27 y 28 → una falta ahí recorta 1/6, ni más ni menos.
    const dto = calcular(tareo30({ 1: 'F' }), 7, 2026, 25);
    expect(dto.descuento_dominical).toBe(UN_SEXTO);
  });

  it('una semana que cruza el corte de mes agrupa sus faltas juntas', () => {
    // Ordinal 5 = 30-jun (martes) y ordinal 6 = 01-jul (miércoles): misma semana
    // calendario (29-jun al 05-jul) aunque cambien de mes → 2/6, no 1/6 + 1/6
    // en semanas distintas.
    const dto = calcular(tareo30({ 5: 'F', 6: 'F' }), 7, 2026, 25);
    expect(dto.descuento_dominical).toBe(33.33);
  });

  it('faltas en semanas distintas de la ventana suman un sexto cada una', () => {
    // Ordinal 5 = 30-jun (semana del 29-jun) y ordinal 12 = 07-jul (semana del
    // 06-jul) → 1/6 + 1/6.
    const dto = calcular(tareo30({ 5: 'F', 12: 'F' }), 7, 2026, 25);
    expect(dto.descuento_dominical).toBe(33.33);
  });

  it('REGRESIÓN: ventana sin faltas tampoco descuenta', () => {
    expect(calcular(tareo30(), 7, 2026, 25).descuento_dominical).toBe(0);
  });
});
