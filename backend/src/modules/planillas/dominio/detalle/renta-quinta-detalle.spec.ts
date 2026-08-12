/**
 * `calcularRentaQuintaDetalle` — mismo procedimiento del Art. 40 del Reglamento
 * LIR que `conceptos/renta-quinta`, pero en el motor del DTO completo.
 *
 * Los dos motores conviven (el de régimen PISA la columna `renta_5ta` del DTO),
 * así que toda regla nueva tiene que entrar en AMBOS o la boleta se desalinea.
 * Estos tests fijan el inciso e) — ingresos extraordinarios del mes — en el
 * motor del detalle; `paridad-camino-real.spec` cierra la equivalencia.
 */
import { calcularRentaQuintaDetalle } from './renta-quinta-detalle';
import {
  calcularRentaQuinta,
  CLAVE_RENTA_5TA,
} from '../conceptos/renta-quinta';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { stubParametrosRegimenes } from '../parametros/parametros-legales.stub';
import { TramoIR } from '../tipos';

const TRAMOS: TramoIR[] = [
  { hasta: 5, tasa: 0.08 },
  { hasta: 20, tasa: 0.14 },
  { hasta: 35, tasa: 0.17 },
  { hasta: 45, tasa: 0.2 },
  { hasta: Infinity, tasa: 0.3 },
];

const UIT = 5500;

// Caso real BENITES MALPICA RAUL, julio 2026 (comparativo con la contadora, C5).
const SUELDO = 5000;
const MES_JULIO = 7;
const ACUMULADO = 30000;
const RETENCIONES_PREVIAS = 1380;
const BONIFICACION_30334 = 450;

const retener = (extraordinarios = 0): number =>
  calcularRentaQuintaDetalle(
    SUELDO,
    MES_JULIO,
    UIT,
    TRAMOS,
    ACUMULADO,
    RETENCIONES_PREVIAS,
    true,
    extraordinarios,
  );

describe('renta-quinta-detalle — ingresos extraordinarios (art. 40 inc. e)', () => {
  it('sin extraordinarios retiene solo la cuota ordinaria del mes', () => {
    expect(retener()).toBe(230);
  });

  it('la bonificación extraordinaria del mes se grava íntegra en ese mes', () => {
    // 2 823 − 2 760 = 63.00 = 450 × 14% (tasa marginal de RAUL).
    expect(retener(BONIFICACION_30334)).toBe(293);
  });

  it('no abre retención al trabajador que sigue bajo 7 UIT con el extraordinario', () => {
    expect(
      calcularRentaQuintaDetalle(
        2000,
        1,
        UIT,
        TRAMOS,
        0,
        0,
        true,
        BONIFICACION_30334,
      ),
    ).toBe(0);
  });
});

describe('renta-quinta-detalle — paridad con el motor de régimen', () => {
  const fecha = new Date('2026-07-31');
  const params: ParametrosLegales = {
    rmv: () => 0,
    uit: () => UIT,
    asignacionFamiliar: () => 0,
    essaludTasa: () => 0,
    essaludMinimo: () => 0,
    sisMicroempresa: () => 0,
    tramosIR: () => TRAMOS,
    sctrSalud: () => 0,
    sctrPension: () => 0,
    vidaLeyTasa: () => 0,
    senatiTasa: () => 0,
    ...stubParametrosRegimenes,
  };

  const porElMotorDeRegimen = (extraordinarios: number): number =>
    calcularRentaQuinta(
      SUELDO,
      MES_JULIO,
      fecha,
      params,
      ACUMULADO,
      RETENCIONES_PREVIAS,
      true,
      extraordinarios,
    )
      .conceptos.filter((c) => c.clave === CLAVE_RENTA_5TA)
      .reduce((a, c) => a + c.monto, 0);

  it.each([0, BONIFICACION_30334, 1000])(
    'ambos motores retienen lo mismo con extraordinarios = %s',
    (extraordinarios) => {
      expect(retener(extraordinarios)).toBe(
        porElMotorDeRegimen(extraordinarios),
      );
    },
  );
});
