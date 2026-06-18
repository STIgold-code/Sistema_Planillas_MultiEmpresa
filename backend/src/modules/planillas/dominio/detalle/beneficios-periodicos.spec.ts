import {
  calcularGratificacionDetalle,
  calcularCtsDetalle,
  calcularBeneficiosTruncosDetalle,
} from './beneficios-periodicos';

describe('calcularGratificacionDetalle', () => {
  it('paga semestre completo en julio con bonificación 30334 (9%)', () => {
    const r = calcularGratificacionDetalle(7, 3000, 6, 0.09);
    expect(r.gratificacionMonto).toBe(3000);
    expect(r.bonifExtraordinariaMonto).toBe(270);
  });

  it('no paga fuera de julio/diciembre', () => {
    expect(calcularGratificacionDetalle(3, 3000, 6, 0.09)).toEqual({
      gratificacionMonto: 0,
      bonifExtraordinariaMonto: 0,
    });
  });

  it('prorratea por meses incompletos', () => {
    expect(
      calcularGratificacionDetalle(12, 3000, 3, 0.09).gratificacionMonto,
    ).toBe(1500);
  });
});

describe('calcularCtsDetalle', () => {
  it('deposita semestre completo en noviembre', () => {
    // (3000/12)*6 = 1500
    expect(calcularCtsDetalle(11, 3000, 6, 0)).toBe(1500);
  });

  it('suma la fracción de días', () => {
    // (3600/12)*6 + (3600/360)*30 = 1800 + 300 = 2100
    expect(calcularCtsDetalle(5, 3600, 6, 30)).toBe(2100);
  });

  it('no deposita fuera de mayo/noviembre', () => {
    expect(calcularCtsDetalle(7, 3000, 6, 0)).toBe(0);
  });
});

describe('calcularBeneficiosTruncosDetalle', () => {
  it('devuelve 0 si el empleado no cesa', () => {
    const r = calcularBeneficiosTruncosDetalle(
      false,
      6,
      30,
      3000,
      3000,
      3000,
      false,
      true,
      113,
    );
    expect(r.totalBeneficiosSociales).toBe(0);
  });

  it('incluye asignación familiar en la base de vacaciones truncas', () => {
    const conAf = calcularBeneficiosTruncosDetalle(
      true,
      6,
      30,
      3000,
      3000,
      3000,
      true,
      true,
      113,
    );
    const sinAf = calcularBeneficiosTruncosDetalle(
      true,
      6,
      30,
      3000,
      3000,
      3000,
      false,
      true,
      113,
    );
    expect(conAf.vacTruncas).toBeGreaterThan(sinAf.vacTruncas);
  });
});
