/**
 * La ley de negocio del descuento de préstamos y adelantos es la spec de estos
 * tests: se escriben ANTES de la implementación (TDD, regla del repo).
 */
import {
  DescuentosPrestamos,
  PrestamoVigente,
  agruparDescuentosPorEmpleado,
  calcularDescuentosPrestamos,
  cuotaEfectiva,
  descuentaEnMes,
} from './descuentos-prestamos';

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

const NINGUNO: DescuentosPrestamos = {
  prestamo: 0,
  adelantoQuincena: 0,
  adelantoGratificacion: 0,
};

describe('cuotaEfectiva', () => {
  it('descuenta la cuota completa cuando el saldo la cubre', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 100, saldo: 500 }))).toBe(
      100,
    );
  });

  it('la ÚLTIMA cuota no excede el saldo (saldo 150, cuota 100 → 100 y luego 50)', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 100, saldo: 50 }))).toBe(50);
  });

  it('con saldo NULL (cuota recurrente sin monto definido) descuenta la cuota completa', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 250, saldo: null }))).toBe(
      250,
    );
  });

  it('con saldo 0 no descuenta nada', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 100, saldo: 0 }))).toBe(0);
  });

  it('nunca devuelve un monto negativo', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 100, saldo: -30 }))).toBe(0);
    expect(cuotaEfectiva(prestamo({ cuotaMensual: -100, saldo: 500 }))).toBe(0);
  });

  it('redondea a 2 decimales', () => {
    expect(cuotaEfectiva(prestamo({ cuotaMensual: 33.333, saldo: null }))).toBe(
      33.33,
    );
  });
});

describe('descuentaEnMes', () => {
  it('PRESTAMO y ADELANTO_SUELDO descuentan todos los meses', () => {
    for (let mes = 1; mes <= 12; mes++) {
      expect(descuentaEnMes('PRESTAMO', mes)).toBe(true);
      expect(descuentaEnMes('ADELANTO_SUELDO', mes)).toBe(true);
    }
  });

  it('ADELANTO_GRATIFICACION solo descuenta en julio y diciembre', () => {
    expect(descuentaEnMes('ADELANTO_GRATIFICACION', 7)).toBe(true);
    expect(descuentaEnMes('ADELANTO_GRATIFICACION', 12)).toBe(true);
    for (const mes of [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]) {
      expect(descuentaEnMes('ADELANTO_GRATIFICACION', mes)).toBe(false);
    }
  });
});

describe('calcularDescuentosPrestamos', () => {
  it('sin préstamos no descuenta nada', () => {
    expect(calcularDescuentosPrestamos([], 3)).toEqual(NINGUNO);
  });

  it('rutea cada tipo a su campo del detalle de planilla', () => {
    const resultado = calcularDescuentosPrestamos(
      [
        prestamo({ id: 1, tipo: 'PRESTAMO', cuotaMensual: 100, saldo: 500 }),
        prestamo({
          id: 2,
          tipo: 'ADELANTO_SUELDO',
          cuotaMensual: 300,
          saldo: null,
        }),
        prestamo({
          id: 3,
          tipo: 'ADELANTO_GRATIFICACION',
          cuotaMensual: 400,
          saldo: 400,
        }),
      ],
      7,
    );

    expect(resultado).toEqual({
      prestamo: 100,
      adelantoQuincena: 300,
      adelantoGratificacion: 400,
    });
  });

  it('suma las cuotas de varios préstamos del mismo tipo', () => {
    const resultado = calcularDescuentosPrestamos(
      [
        prestamo({ id: 1, cuotaMensual: 100, saldo: 500 }),
        prestamo({ id: 2, cuotaMensual: 250.5, saldo: 1000 }),
      ],
      4,
    );

    expect(resultado.prestamo).toBe(350.5);
  });

  it('en la última cuota descuenta solo el saldo remanente y deja el préstamo en cero', () => {
    const primera = calcularDescuentosPrestamos(
      [prestamo({ cuotaMensual: 100, saldo: 150 })],
      4,
    );
    expect(primera.prestamo).toBe(100);

    const ultima = calcularDescuentosPrestamos(
      [prestamo({ cuotaMensual: 100, saldo: 50 })],
      5,
    );
    expect(ultima.prestamo).toBe(50);
  });

  it('el adelanto de gratificación NO descuenta fuera de julio/diciembre', () => {
    const prestamos = [
      prestamo({ tipo: 'ADELANTO_GRATIFICACION', cuotaMensual: 400 }),
    ];

    expect(
      calcularDescuentosPrestamos(prestamos, 6).adelantoGratificacion,
    ).toBe(0);
    expect(
      calcularDescuentosPrestamos(prestamos, 7).adelantoGratificacion,
    ).toBe(400);
    expect(
      calcularDescuentosPrestamos(prestamos, 8).adelantoGratificacion,
    ).toBe(0);
    expect(
      calcularDescuentosPrestamos(prestamos, 12).adelantoGratificacion,
    ).toBe(400);
  });

  it('ignora préstamos ya cancelados de hecho (saldo agotado)', () => {
    expect(calcularDescuentosPrestamos([prestamo({ saldo: 0 })], 4)).toEqual(
      NINGUNO,
    );
  });
});

describe('agruparDescuentosPorEmpleado', () => {
  it('agrupa por empleado sin mezclar montos entre trabajadores', () => {
    const mapa = agruparDescuentosPorEmpleado(
      [
        prestamo({ id: 1, empleadoId: 100, cuotaMensual: 100, saldo: 500 }),
        prestamo({ id: 2, empleadoId: 100, cuotaMensual: 50, saldo: 500 }),
        prestamo({
          id: 3,
          empleadoId: 200,
          tipo: 'ADELANTO_SUELDO',
          cuotaMensual: 300,
          saldo: null,
        }),
      ],
      4,
    );

    expect(mapa.get(100)).toEqual({
      prestamo: 150,
      adelantoQuincena: 0,
      adelantoGratificacion: 0,
    });
    expect(mapa.get(200)).toEqual({
      prestamo: 0,
      adelantoQuincena: 300,
      adelantoGratificacion: 0,
    });
    expect(mapa.get(300)).toBeUndefined();
  });
});
