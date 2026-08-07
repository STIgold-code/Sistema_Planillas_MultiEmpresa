import { PrestamoVigente } from './descuentos-prestamos';
import { repartirCargo } from './amortizacion-prestamos';

function prestamo(parcial: Partial<PrestamoVigente> = {}): PrestamoVigente {
  return {
    id: 1,
    empleadoId: 100,
    tipo: 'PRESTAMO',
    cuotaMensual: 100,
    saldo: 500,
    ...parcial,
  };
}

describe('repartirCargo', () => {
  it('sin monto aplicado no genera cargos', () => {
    expect(repartirCargo([prestamo()], 0)).toEqual([]);
    expect(repartirCargo([prestamo()], -50)).toEqual([]);
  });

  it('descuenta la cuota y baja el saldo', () => {
    const cargos = repartirCargo(
      [prestamo({ cuotaMensual: 100, saldo: 500 })],
      100,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 100, saldoResultante: 400, quedaPagado: false },
    ]);
  });

  it('la última cuota cancela el préstamo (saldo 50 → PAGADO)', () => {
    const cargos = repartirCargo(
      [prestamo({ cuotaMensual: 100, saldo: 50 })],
      50,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 50, saldoResultante: 0, quedaPagado: true },
    ]);
  });

  it('con saldo NULL (recurrente) nunca queda PAGADO', () => {
    const cargos = repartirCargo(
      [prestamo({ cuotaMensual: 300, saldo: null })],
      300,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 300, saldoResultante: null, quedaPagado: false },
    ]);
  });

  it('reparte entre varios préstamos en el orden recibido', () => {
    const cargos = repartirCargo(
      [
        prestamo({ id: 1, cuotaMensual: 100, saldo: 500 }),
        prestamo({ id: 2, cuotaMensual: 200, saldo: 200 }),
      ],
      300,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 100, saldoResultante: 400, quedaPagado: false },
      { prestamoId: 2, monto: 200, saldoResultante: 0, quedaPagado: true },
    ]);
  });

  it('si el monto del detalle fue reducido a mano, solo amortiza lo efectivamente descontado', () => {
    const cargos = repartirCargo(
      [
        prestamo({ id: 1, cuotaMensual: 100, saldo: 500 }),
        prestamo({ id: 2, cuotaMensual: 200, saldo: 800 }),
      ],
      150,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 100, saldoResultante: 400, quedaPagado: false },
      { prestamoId: 2, monto: 50, saldoResultante: 750, quedaPagado: false },
    ]);
  });

  it('el excedente de un override manual al alza NO se imputa a ningún préstamo', () => {
    const cargos = repartirCargo(
      [prestamo({ id: 1, cuotaMensual: 100, saldo: 500 })],
      450,
    );

    expect(cargos).toEqual([
      { prestamoId: 1, monto: 100, saldoResultante: 400, quedaPagado: false },
    ]);
  });

  it('salta préstamos con saldo agotado', () => {
    const cargos = repartirCargo(
      [
        prestamo({ id: 1, cuotaMensual: 100, saldo: 0 }),
        prestamo({ id: 2, cuotaMensual: 100, saldo: 500 }),
      ],
      100,
    );

    expect(cargos).toEqual([
      { prestamoId: 2, monto: 100, saldoResultante: 400, quedaPagado: false },
    ]);
  });
});
