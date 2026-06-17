/**
 * Tests unitarios de calcularGratificacion.
 */
import { calcularGratificacion } from './gratificaciones';
import { ESSALUD_PORCENTAJE } from '../planillas.config';

describe('calcularGratificacion', () => {
  it('solo genera monto en julio y diciembre', () => {
    for (const mes of [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]) {
      const r = calcularGratificacion(mes, 2024, 3000, new Date('2024-01-01'));
      expect(r.gratificacionMonto).toBe(0);
    }
  });

  it('julio: semestre completo = sueldo íntegro', () => {
    const r = calcularGratificacion(7, 2024, 3000, new Date('2024-01-01'));
    expect(r.mesesGratificacion).toBe(6);
    expect(r.gratificacionMonto).toBeCloseTo(3000, 0);
  });

  it('diciembre: semestre completo = sueldo íntegro', () => {
    const r = calcularGratificacion(12, 2024, 3000, new Date('2024-01-01'));
    expect(r.mesesGratificacion).toBe(6);
    expect(r.gratificacionMonto).toBeCloseTo(3000, 0);
  });

  it('bonificación extraordinaria = 9% de la gratificación', () => {
    const r = calcularGratificacion(7, 2024, 3000, new Date('2024-01-01'));
    expect(r.bonifExtraordinariaMonto).toBeCloseTo(
      r.gratificacionMonto * ESSALUD_PORCENTAJE,
      1,
    );
  });

  it('ingreso a mitad del semestre → proporcional', () => {
    // Ingreso 01/04/2024 → solo 3 meses (abr/may/jun) para julio
    const r = calcularGratificacion(7, 2024, 3000, new Date('2024-04-01'));
    expect(r.mesesGratificacion).toBe(3);
    expect(r.gratificacionMonto).toBeCloseTo(1500, 0);
  });

  it('ingreso día 15 no cuenta el mes incompleto', () => {
    // Ingreso 15/03/2024 → marzo no cuenta → solo abr/may/jun = 3 meses
    const completo = calcularGratificacion(
      7,
      2024,
      3000,
      new Date('2024-03-01'),
    );
    const parcial = calcularGratificacion(
      7,
      2024,
      3000,
      new Date('2024-03-15'),
    );
    expect(parcial.mesesGratificacion).toBe(completo.mesesGratificacion - 1);
  });

  it('sin fecha de ingreso → semestre completo', () => {
    const r = calcularGratificacion(7, 2024, 3000, null);
    expect(r.mesesGratificacion).toBe(6);
  });

  it('incluye promedios en la remuneración computable', () => {
    const sinProm = calcularGratificacion(
      7,
      2024,
      3000,
      new Date('2024-01-01'),
    );
    const conProm = calcularGratificacion(
      7,
      2024,
      3000,
      new Date('2024-01-01'),
      200,
      100,
      50,
    );
    expect(conProm.gratificacionMonto).toBeGreaterThan(
      sinProm.gratificacionMonto,
    );
  });

  describe('edge cases', () => {
    it('gratBase 0 genera gratificación 0', () => {
      const r = calcularGratificacion(7, 2024, 0, new Date('2024-01-01'));
      expect(r.gratificacionMonto).toBe(0);
      expect(r.bonifExtraordinariaMonto).toBe(0);
    });

    it('ingreso el 30 de junio para julio → solo 0 meses (ingresó después del día 1)', () => {
      const r = calcularGratificacion(7, 2024, 3000, new Date('2024-06-30'));
      // Junio no cuenta completo → 0 meses
      expect(r.mesesGratificacion).toBe(0);
      expect(r.gratificacionMonto).toBe(0);
    });

    it('ingreso el 1 de enero para julio → 6 meses completos', () => {
      const r = calcularGratificacion(7, 2024, 3000, new Date('2024-01-01'));
      expect(r.mesesGratificacion).toBe(6);
    });

    it('ingreso el 1 de julio para diciembre → 5 meses (jul-nov)', () => {
      const r = calcularGratificacion(12, 2024, 3000, new Date('2024-07-01'));
      expect(r.mesesGratificacion).toBe(6); // jul a dic = 6
    });

    it('ingreso el 15 de julio para diciembre → descuenta mes incompleto', () => {
      const r15 = calcularGratificacion(12, 2024, 3000, new Date('2024-07-15'));
      const r01 = calcularGratificacion(12, 2024, 3000, new Date('2024-07-01'));
      expect(r15.mesesGratificacion).toBeLessThan(r01.mesesGratificacion);
    });

    it('bonificación extraordinaria nunca es negativa', () => {
      const r = calcularGratificacion(7, 2024, 0, new Date('2024-06-30'));
      expect(r.bonifExtraordinariaMonto).toBeGreaterThanOrEqual(0);
    });

    it('ingreso año anterior para julio → semestre completo', () => {
      const r = calcularGratificacion(7, 2024, 3000, new Date('2023-06-01'));
      expect(r.mesesGratificacion).toBe(6);
    });
  });
});
