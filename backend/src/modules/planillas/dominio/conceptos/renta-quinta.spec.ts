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
