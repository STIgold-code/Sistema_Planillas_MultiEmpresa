/**
 * Tests unitarios de calcularHorasExtras.
 */
import { calcularHorasExtras } from './horas-extras';
import { SOBRETASA_NOCTURNA, round2 } from '../planillas.config';

const SUELDO = 3000;
const VALOR_HORA = round2(SUELDO / 30 / 8); // 12.5

const ZERO_HE = {
  totalHorasExtrasDiurnas25: 0,
  totalHorasExtrasDiurnas35: 0,
  totalHorasExtrasNocturnas25: 0,
  totalHorasExtrasNocturnas35: 0,
};

describe('calcularHorasExtras', () => {
  it('sin horas extras todo es 0', () => {
    const r = calcularHorasExtras(SUELDO, ZERO_HE);
    expect(r.horasExtras).toBe(0);
    expect(r.horasExtras25).toBe(0);
    expect(r.horasExtras35).toBe(0);
  });

  it('valor hora normal = sueldo / 30 / 8', () => {
    const r = calcularHorasExtras(SUELDO, ZERO_HE);
    expect(r.valorHoraNormal).toBe(VALOR_HORA);
  });

  it('HE diurnas 25% = horas × valorHora × 1.25', () => {
    const r = calcularHorasExtras(SUELDO, {
      ...ZERO_HE,
      totalHorasExtrasDiurnas25: 4,
    });
    expect(r.horasExtrasDiurnas25).toBeCloseTo(
      4 * round2(VALOR_HORA * 1.25),
      1,
    );
    expect(r.horasExtras25).toBe(r.horasExtrasDiurnas25);
  });

  it('HE diurnas 35% = horas × valorHora × 1.35', () => {
    const r = calcularHorasExtras(SUELDO, {
      ...ZERO_HE,
      totalHorasExtrasDiurnas35: 3,
    });
    expect(r.horasExtrasDiurnas35).toBeCloseTo(
      3 * round2(VALOR_HORA * 1.35),
      1,
    );
    expect(r.horasExtras35).toBe(r.horasExtrasDiurnas35);
  });

  it('HE nocturnas combinan sobretasa nocturna + sobretasa HE', () => {
    const r = calcularHorasExtras(SUELDO, {
      ...ZERO_HE,
      totalHorasExtrasNocturnas25: 2,
    });
    const esperado = round2(
      2 * round2(VALOR_HORA * (1 + SOBRETASA_NOCTURNA) * 1.25),
    );
    expect(r.horasExtrasNocturnas25).toBeCloseTo(esperado, 1);
  });

  it('HE 35% > HE 25% para mismas horas', () => {
    const r = calcularHorasExtras(SUELDO, {
      totalHorasExtrasDiurnas25: 2,
      totalHorasExtrasDiurnas35: 2,
      totalHorasExtrasNocturnas25: 0,
      totalHorasExtrasNocturnas35: 0,
    });
    expect(r.horasExtrasDiurnas35).toBeGreaterThan(r.horasExtrasDiurnas25);
  });

  it('horasExtras = horasExtras25 + horasExtras35', () => {
    const r = calcularHorasExtras(SUELDO, {
      totalHorasExtrasDiurnas25: 2,
      totalHorasExtrasDiurnas35: 1,
      totalHorasExtrasNocturnas25: 1,
      totalHorasExtrasNocturnas35: 1,
    });
    expect(r.horasExtras).toBeCloseTo(r.horasExtras25 + r.horasExtras35, 2);
  });

  it('escala con el sueldo', () => {
    const acum = { ...ZERO_HE, totalHorasExtrasDiurnas25: 4 };
    const r1 = calcularHorasExtras(2000, acum);
    const r2 = calcularHorasExtras(4000, acum);
    expect(r2.horasExtras25).toBeGreaterThan(r1.horasExtras25);
  });

  describe('edge cases', () => {
    it('sueldo 0 no genera NaN', () => {
      const r = calcularHorasExtras(0, {
        ...ZERO_HE,
        totalHorasExtrasDiurnas25: 5,
      });
      expect(r.valorHoraNormal).toBe(0);
      expect(r.horasExtras25).toBe(0);
      expect(isNaN(r.horasExtras)).toBe(false);
    });

    it('horas fraccionarias (0.5 horas extra)', () => {
      const r = calcularHorasExtras(SUELDO, {
        ...ZERO_HE,
        totalHorasExtrasDiurnas25: 0.5,
      });
      expect(r.horasExtrasDiurnas25).toBeGreaterThan(0);
      expect(r.horasExtrasDiurnas25).toBeLessThan(r.valorHoraExtra25);
    });

    it('cantidad masiva de horas extras no desborda', () => {
      const r = calcularHorasExtras(SUELDO, {
        ...ZERO_HE,
        totalHorasExtrasDiurnas25: 100,
      });
      expect(r.horasExtras25).toBeGreaterThan(0);
      expect(isFinite(r.horasExtras25)).toBe(true);
    });

    it('HE nocturna siempre > HE diurna para misma cantidad de horas', () => {
      const diurna = calcularHorasExtras(SUELDO, {
        ...ZERO_HE,
        totalHorasExtrasDiurnas25: 1,
      });
      const nocturna = calcularHorasExtras(SUELDO, {
        ...ZERO_HE,
        totalHorasExtrasNocturnas25: 1,
      });
      expect(nocturna.horasExtrasNocturnas25).toBeGreaterThan(
        diurna.horasExtrasDiurnas25,
      );
    });
  });
});
