/**
 * Tests unitarios de calcularCts.
 */
import { calcularCts } from './cts';

describe('calcularCts', () => {
  it('solo genera monto en mayo y noviembre', () => {
    for (const mes of [1, 2, 3, 4, 6, 7, 8, 9, 10, 12]) {
      const r = calcularCts(mes, 2024, 3000, 500, 0, 0, new Date('2024-01-01'));
      expect(r.ctsMonto).toBe(0);
    }
  });

  it('mayo: semestre completo (6 meses)', () => {
    // Ingresó mucho antes del semestre nov-abr
    const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2023-01-01'));
    expect(r.mesesCts).toBe(6);
    expect(r.ctsMonto).toBeGreaterThan(0);
  });

  it('noviembre: semestre completo (6 meses)', () => {
    const r = calcularCts(11, 2024, 3000, 500, 0, 0, new Date('2024-01-01'));
    expect(r.mesesCts).toBe(6);
    expect(r.ctsMonto).toBeGreaterThan(0);
  });

  it('fórmula: (rem.comp / 12) × meses + (rem.comp / 360) × días', () => {
    // Semestre completo, sin fracción
    const remComp = 3000 + 500; // ctsBase + sextoGrat
    const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2023-01-01'));
    const esperado = (remComp / 12) * 6;
    expect(r.ctsMonto).toBeCloseTo(esperado, 0);
  });

  it('ingreso a mitad del semestre → meses proporcionales', () => {
    const completo = calcularCts(
      11,
      2024,
      3000,
      500,
      0,
      0,
      new Date('2024-01-01'),
    );
    // Ingreso junio → 5 meses (jun-oct) para CTS noviembre
    const parcial = calcularCts(
      11,
      2024,
      3000,
      500,
      0,
      0,
      new Date('2024-06-01'),
    );
    expect(parcial.mesesCts).toBeLessThan(completo.mesesCts);
    expect(parcial.ctsMonto).toBeLessThan(completo.ctsMonto);
    expect(parcial.ctsMonto).toBeGreaterThan(0);
  });

  it('ingreso día 15 genera días fracción', () => {
    const r = calcularCts(11, 2024, 3000, 500, 0, 0, new Date('2024-06-15'));
    expect(r.diasCts).toBeGreaterThan(0);
  });

  it('incluye promedios en la remuneración computable', () => {
    const sinProm = calcularCts(
      5,
      2024,
      3000,
      500,
      0,
      0,
      new Date('2023-01-01'),
    );
    const conProm = calcularCts(
      5,
      2024,
      3000,
      500,
      200,
      100,
      new Date('2023-01-01'),
    );
    expect(conProm.ctsMonto).toBeGreaterThan(sinProm.ctsMonto);
  });

  it('sin fecha de ingreso → semestre completo', () => {
    const r = calcularCts(5, 2024, 3000, 500, 0, 0, null);
    expect(r.mesesCts).toBe(6);
  });

  describe('edge cases', () => {
    it('ctsBase 0 genera CTS 0', () => {
      const r = calcularCts(5, 2024, 0, 0, 0, 0, new Date('2023-01-01'));
      expect(r.ctsMonto).toBe(0);
    });

    it('ingreso en diciembre del año anterior para CTS mayo', () => {
      // Semestre: nov(2023)-abr(2024). Ingresó dic 2023 → 5 meses (dic-abr)
      const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2023-12-01'));
      expect(r.mesesCts).toBe(5);
      expect(r.ctsMonto).toBeGreaterThan(0);
    });

    it('ingreso en noviembre del año anterior para CTS mayo → 6 meses', () => {
      const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2023-11-01'));
      expect(r.mesesCts).toBe(6);
    });

    it('ingreso día 31 genera días fracción correctos', () => {
      // Enero tiene 31 días. Ingreso el 31 → 1 día de fracción
      const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2024-01-31'));
      expect(r.diasCts).toBe(1);
    });

    it('ingreso el último día de abril para CTS mayo → 0 meses, días del último día', () => {
      const r = calcularCts(5, 2024, 3000, 500, 0, 0, new Date('2024-04-30'));
      expect(r.mesesCts).toBe(0);
      expect(r.diasCts).toBe(1);
      expect(r.ctsMonto).toBeGreaterThan(0); // al menos 1 día
    });

    it('CTS noviembre con ingreso en mayo → 6 meses', () => {
      const r = calcularCts(11, 2024, 3000, 500, 0, 0, new Date('2024-05-01'));
      expect(r.mesesCts).toBe(6);
    });

    it('CTS noviembre con ingreso en octubre → 1 mes', () => {
      const r = calcularCts(11, 2024, 3000, 500, 0, 0, new Date('2024-10-01'));
      expect(r.mesesCts).toBe(1);
    });

    it('sextoGratificacion alto incrementa la CTS proporcionalmente', () => {
      const bajo = calcularCts(
        5,
        2024,
        3000,
        100,
        0,
        0,
        new Date('2023-01-01'),
      );
      const alto = calcularCts(
        5,
        2024,
        3000,
        1000,
        0,
        0,
        new Date('2023-01-01'),
      );
      expect(alto.ctsMonto).toBeGreaterThan(bajo.ctsMonto);
    });
  });
});
