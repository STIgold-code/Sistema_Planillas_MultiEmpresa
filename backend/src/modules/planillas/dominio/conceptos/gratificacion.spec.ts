import { calcularGratificacion, CLAVE_GRATIFICACION } from './gratificacion';
import { ResumenTareo } from '../tipos';

const resumenLleno: ResumenTareo = {
  diasTrabajados: 30,
  horasNormales: 240,
  horasExtras25: 0,
  horasExtras35: 0,
  horasExtrasNocturnas25: 0,
  horasExtrasNocturnas35: 0,
  diasNocturnos: 0,
};

describe('gratificacion (D.L. 728 — Ley 27735)', () => {
  it('paga un sueldo completo por semestre completo en julio', () => {
    const r = calcularGratificacion({
      mes: 7,
      remuneracionComputable: 3000,
      mesesTrabajados: 6,
      resumenTareo: resumenLleno,
    });
    const grati = r.conceptos.find((c) => c.clave === CLAVE_GRATIFICACION);
    expect(grati?.monto).toBe(3000);
    expect(grati?.tipo).toBe('ingreso');
  });

  it('paga un sueldo completo en diciembre', () => {
    const r = calcularGratificacion({
      mes: 12,
      remuneracionComputable: 2000,
      mesesTrabajados: 6,
      resumenTareo: resumenLleno,
    });
    expect(
      r.conceptos.find((c) => c.clave === CLAVE_GRATIFICACION)?.monto,
    ).toBe(2000);
  });

  it('prorratea por meses trabajados en el semestre', () => {
    const r = calcularGratificacion({
      mes: 7,
      remuneracionComputable: 3000,
      mesesTrabajados: 3,
      resumenTareo: resumenLleno,
    });
    expect(
      r.conceptos.find((c) => c.clave === CLAVE_GRATIFICACION)?.monto,
    ).toBe(1500);
  });

  it('no genera gratificación fuera de julio/diciembre', () => {
    const r = calcularGratificacion({
      mes: 3,
      remuneracionComputable: 3000,
      mesesTrabajados: 6,
      resumenTareo: resumenLleno,
    });
    expect(r.conceptos).toHaveLength(0);
  });
});

/**
 * D.S. 005-2002-TR art. 3.4 (texto vigente según D.S. 017-2002-TR): los días que
 * NO se consideran tiempo efectivamente laborado se deducen a razón de un
 * treintavo de la fracción correspondiente (del sexto del semestre).
 * Computable 1800 → un treintavo del sexto = 1800/180 = S/ 10 por día.
 */
describe('gratificación — deducción de días no laborados (D.S. 005-2002-TR art. 3.4)', () => {
  const grati = (
    diasNoLaboradosSemestre: number,
    mesesTrabajados = 6,
    fraccionSemestre = 1,
  ): number =>
    calcularGratificacion(
      {
        mes: 7,
        remuneracionComputable: 1800,
        mesesTrabajados,
        resumenTareo: resumenLleno,
        diasNoLaboradosSemestre,
      },
      fraccionSemestre,
    ).conceptos.find((c) => c.clave === CLAVE_GRATIFICACION)?.monto ?? 0;

  it('REGRESIÓN: semestre completo sin ausencias paga el íntegro (180/180)', () => {
    expect(grati(0)).toBe(1800);
  });

  it('5 días no laborados pagan 175/180 (caso real FRANCISCO)', () => {
    expect(grati(5)).toBe(1750);
  });

  it('9 días no laborados pagan 171/180 (caso real GARRO)', () => {
    expect(grati(9)).toBe(1710);
  });

  it('deduce treintavos también sobre un semestre incompleto', () => {
    // 3 meses = 90/180 → 900, menos 3 treintavos del sexto (30) = 870.
    expect(grati(3, 3)).toBe(870);
  });

  it('la fracción del régimen escala también la deducción', () => {
    // REMYPE pequeña empresa (1/2 sueldo): 900 − 6 × (1800 × 0.5 / 180) = 870.
    expect(grati(6, 6, 0.5)).toBe(870);
  });

  it('nunca paga negativo: el piso es 0', () => {
    expect(grati(200)).toBe(0);
  });
});
