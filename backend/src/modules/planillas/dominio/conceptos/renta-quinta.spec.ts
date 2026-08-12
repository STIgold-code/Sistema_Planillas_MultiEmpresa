import { calcularRentaQuinta, CLAVE_RENTA_5TA } from './renta-quinta';
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

const params = (uit: number, tramos: TramoIR[]): ParametrosLegales => ({
  rmv: () => 0,
  uit: () => uit,
  asignacionFamiliar: () => 0,
  essaludTasa: () => 0,
  essaludMinimo: () => 0,
  sisMicroempresa: () => 0,
  tramosIR: () => tramos,
  sctrSalud: () => 0,
  sctrPension: () => 0,
  vidaLeyTasa: () => 0,
  senatiTasa: () => 0,
  ...stubParametrosRegimenes,
});

const monto = (r: ReturnType<typeof calcularRentaQuinta>): number =>
  r.conceptos
    .filter((c) => c.clave === CLAVE_RENTA_5TA)
    .reduce((a, c) => a + c.monto, 0);

describe('renta-quinta (IR 5ta categoría)', () => {
  const fecha = new Date('2026-03-31');

  it('no retiene cuando la renta proyectada no supera 7 UIT', () => {
    // sueldo bajo, UIT 5500 → 7 UIT = 38500; renta anual << deducción
    const r = calcularRentaQuinta(2000, 3, fecha, params(5500, TRAMOS));
    expect(monto(r)).toBe(0);
  });

  it('resuelve UIT y tramos por la fecha del período (no hardcode)', () => {
    // sueldo alto para superar la deducción
    const r = calcularRentaQuinta(15000, 1, fecha, params(5500, TRAMOS));
    expect(monto(r)).toBeGreaterThan(0);
    expect(r.conceptos[0].tipo).toBe('descuento');
  });

  it('una UIT distinta cambia la retención (prueba la resolución por parámetro)', () => {
    const conUit5500 = monto(
      calcularRentaQuinta(15000, 1, fecha, params(5500, TRAMOS)),
    );
    const conUit3000 = monto(
      calcularRentaQuinta(15000, 1, fecha, params(3000, TRAMOS)),
    );
    expect(conUit3000).toBeGreaterThan(conUit5500);
  });
});

describe('renta-quinta — ingresos extraordinarios del mes (D.S. 122-94-EF art. 40 inc. e)', () => {
  const fecha = new Date('2026-07-31');

  // Caso real BENITES MALPICA RAUL, julio 2026 (comparativo con la contadora,
  // gap C5). Sueldo 5 000, UIT 5 500, 6 meses acumulados (30 000) y 1 380 ya
  // retenidos (230 × 6). Proyección: 30 000 + 5 000 × 6 + 2 gratificaciones
  // = 70 000; menos 7 UIT (38 500) = 31 500 de renta neta.
  const SUELDO = 5000;
  const MES_JULIO = 7;
  const ACUMULADO = 30000;
  const RETENCIONES_PREVIAS = 1380;
  const BONIFICACION_30334 = 450; // 9% de la gratificación de 5 000

  const retener = (extraordinarios = 0): number =>
    monto(
      calcularRentaQuinta(
        SUELDO,
        MES_JULIO,
        fecha,
        params(5500, TRAMOS),
        ACUMULADO,
        RETENCIONES_PREVIAS,
        true,
        extraordinarios,
      ),
    );

  it('sin ingresos extraordinarios retiene solo la cuota ordinaria del mes', () => {
    // (31 500 → 27 500 × 8% + 4 000 × 14% = 2 760) − 1 380 = 1 380 ÷ 6 = 230.00
    expect(retener()).toBe(230);
  });

  it('la bonificación extraordinaria del mes se grava ÍNTEGRA en ese mes', () => {
    // 31 950 → 27 500 × 8% + 4 450 × 14% = 2 823; adicional = 2 823 − 2 760 = 63
    expect(retener(BONIFICACION_30334)).toBe(293);
  });

  it('el impuesto adicional es el extraordinario por la tasa MARGINAL, no prorrateado', () => {
    const delta = retener(BONIFICACION_30334) - retener();
    expect(delta).toBeCloseTo(BONIFICACION_30334 * 0.14, 2);
  });

  it('no grava al trabajador que sigue bajo 7 UIT aun sumando el extraordinario', () => {
    // Enero, sin acumulados: 2 000 × 14 = 28 000 (+450) < 38 500. Sin renta
    // neta no hay nada que gravar — el extraordinario NO abre la retención.
    const r = calcularRentaQuinta(
      2000,
      1,
      fecha,
      params(5500, TRAMOS),
      0,
      0,
      true,
      BONIFICACION_30334,
    );
    expect(monto(r)).toBe(0);
  });

  it('grava solo el exceso cuando el extraordinario hace cruzar las 7 UIT', () => {
    // Enero, sin acumulados: 2 750 × 14 = 38 500 exactos (renta neta 0). Con
    // 450 de extraordinario la renta neta pasa a 450 y tributa el primer tramo:
    // 450 × 8% = 36.00.
    const r = calcularRentaQuinta(
      2750,
      1,
      fecha,
      params(5500, TRAMOS),
      0,
      0,
      true,
      BONIFICACION_30334,
    );
    expect(monto(r)).toBe(36);
  });
});

describe('renta-quinta — trabajador NO DOMICILIADO (Art. 54/76 LIR)', () => {
  const fecha = new Date('2026-03-31');

  it('retiene 30% plano sobre la remuneración mensual, sin deducción de 7 UIT', () => {
    // Con 2000 mensuales un domiciliado no retiene (no supera 7 UIT); un no
    // domiciliado retiene 30% directo desde el primer sol.
    const r = calcularRentaQuinta(
      2000,
      3,
      fecha,
      params(5500, TRAMOS),
      0,
      0,
      false,
    );
    expect(monto(r)).toBe(600);
  });

  it('no proyecta anualmente: la retención es mensual y definitiva', () => {
    // Mismo sueldo en meses distintos → misma retención (sin proyección).
    const enero = monto(
      calcularRentaQuinta(4000, 1, fecha, params(5500, TRAMOS), 0, 0, false),
    );
    const noviembre = monto(
      calcularRentaQuinta(4000, 11, fecha, params(5500, TRAMOS), 0, 0, false),
    );
    expect(enero).toBe(1200);
    expect(noviembre).toBe(1200);
  });

  it('domiciliado por defecto: la firma sin el flag mantiene el cálculo progresivo', () => {
    const implicito = monto(
      calcularRentaQuinta(15000, 1, fecha, params(5500, TRAMOS)),
    );
    const explicito = monto(
      calcularRentaQuinta(15000, 1, fecha, params(5500, TRAMOS), 0, 0, true),
    );
    expect(implicito).toBe(explicito);
  });
});
