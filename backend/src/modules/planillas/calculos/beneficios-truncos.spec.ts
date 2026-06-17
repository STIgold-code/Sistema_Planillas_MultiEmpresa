/**
 * Tests unitarios de calcularBeneficiosTruncos.
 */
import { calcularBeneficiosTruncos } from './beneficios-truncos';
import { ASIGNACION_FAMILIAR } from '../planillas.config';

describe('calcularBeneficiosTruncos', () => {
  it('no genera truncas si empleado no cesa', () => {
    const r = calcularBeneficiosTruncos(
      false,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    expect(r.ctsTrunca).toBe(0);
    expect(r.gratTrunca).toBe(0);
    expect(r.vacTruncas).toBe(0);
    expect(r.totalBeneficiosSociales).toBe(0);
  });

  it('calcula CTS trunca proporcional al mes de cese', () => {
    // Cese en marzo → meses desde último CTS (nov): dic + ene + feb = 3 meses
    const r = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    expect(r.ctsTrunca).toBeGreaterThan(0);
  });

  it('calcula gratificación trunca proporcional', () => {
    // Cese en marzo → 3 meses del semestre ene-jun
    const r = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    expect(r.gratTrunca).toBeGreaterThan(0);
    // gratTrunca = (remCompGrat / 6) × 3 = 1500
    expect(r.gratTrunca).toBeCloseTo(1500, 0);
  });

  it('calcula vacaciones truncas', () => {
    const r = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    // vacTruncas = (sueldo / 12) × 3 meses = 750
    expect(r.vacTruncas).toBeCloseTo(750, 0);
  });

  it('vacaciones truncas con asig. familiar incluye el plus', () => {
    const sin = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    const con = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      true,
      true,
    );
    expect(con.vacTruncas).toBeGreaterThan(sin.vacTruncas);
    // Diferencia = (ASIGNACION_FAMILIAR / 12) × 3
    const diff = (ASIGNACION_FAMILIAR / 12) * 3;
    expect(con.vacTruncas - sin.vacTruncas).toBeCloseTo(diff, 0);
  });

  it('sin fecha de ingreso no calcula vacaciones truncas', () => {
    const r = calcularBeneficiosTruncos(
      true,
      3,
      15,
      3500,
      3000,
      3000,
      false,
      false,
    );
    expect(r.vacTruncas).toBe(0);
    expect(r.ctsTrunca).toBeGreaterThan(0); // CTS sí
  });

  it('totalBeneficiosSociales = suma de las 3 truncas', () => {
    const r = calcularBeneficiosTruncos(
      true,
      6,
      20,
      3500,
      3000,
      3000,
      true,
      true,
    );
    expect(r.totalBeneficiosSociales).toBeCloseTo(
      r.ctsTrunca + r.gratTrunca + r.vacTruncas,
      2,
    );
  });

  it('cese en segundo semestre calcula correctamente', () => {
    // Cese en septiembre → 3 meses del semestre jul-dic para gratTrunca
    const r = calcularBeneficiosTruncos(
      true,
      9,
      15,
      3500,
      3000,
      3000,
      false,
      true,
    );
    expect(r.gratTrunca).toBeCloseTo(1500, 0); // (3000/6) × 3
  });

  describe('edge cases', () => {
    it('cese en enero → CTS trunca cuenta desde noviembre (2 meses)', () => {
      // mes <= 5: mesesDesdeUltimoCts = mes - 1 + 2 = 1 - 1 + 2 = 2
      const r = calcularBeneficiosTruncos(
        true,
        1,
        15,
        3500,
        3000,
        3000,
        false,
        true,
      );
      // CTS trunca = (3500/12)*2 + (3500/360)*15
      const esperadoCts = (3500 / 12) * 2 + (3500 / 360) * 15;
      expect(r.ctsTrunca).toBeCloseTo(esperadoCts, 0);
    });

    it('cese en diciembre → gratificación trunca 6 meses (semestre completo)', () => {
      // mes=12 → mesesDesdeInicioSemestre = 12 - 6 = 6
      const r = calcularBeneficiosTruncos(
        true,
        12,
        15,
        3500,
        3000,
        3000,
        false,
        true,
      );
      expect(r.gratTrunca).toBeCloseTo(3000, 0); // (3000/6)*6
    });

    it('cese en junio → gratificación trunca 6 meses (semestre ene-jun)', () => {
      // mes=6 → mesesDesdeInicioSemestre = 6
      const r = calcularBeneficiosTruncos(
        true,
        6,
        15,
        3500,
        3000,
        3000,
        false,
        true,
      );
      expect(r.gratTrunca).toBeCloseTo(3000, 0);
    });

    it('0 días trabajados genera CTS trunca solo por meses', () => {
      const r = calcularBeneficiosTruncos(
        true,
        3,
        0,
        3500,
        3000,
        3000,
        false,
        true,
      );
      // diasFraccionCts = 0, solo cuenta meses
      const esperado = (3500 / 12) * 4; // 4 meses desde nov
      expect(r.ctsTrunca).toBeCloseTo(esperado, 0);
    });

    it('sueldo 0 genera todos los truncos en 0', () => {
      const r = calcularBeneficiosTruncos(true, 3, 15, 0, 0, 0, false, true);
      expect(r.ctsTrunca).toBe(0);
      expect(r.gratTrunca).toBe(0);
      expect(r.vacTruncas).toBe(0);
    });

    it('vacaciones truncas en mes 12 = sueldo completo (12/12)', () => {
      const r = calcularBeneficiosTruncos(
        true,
        12,
        15,
        3500,
        3000,
        3000,
        false,
        true,
      );
      // vacTruncas = (3000/12) * min(12, 12) = 3000
      expect(r.vacTruncas).toBeCloseTo(3000, 0);
    });

    it('vacaciones truncas en mes 1 = 1/12 del sueldo', () => {
      const r = calcularBeneficiosTruncos(
        true,
        1,
        15,
        3500,
        3000,
        3000,
        false,
        true,
      );
      expect(r.vacTruncas).toBeCloseTo(250, 0); // 3000/12 = 250
    });
  });
});
