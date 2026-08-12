import {
  DIVISOR_PROMEDIO_SEMESTRE,
  MESES_MINIMOS_REGULARIDAD,
  promedioComputableVariable,
  promedioComputableVariables,
} from './remuneracion-variable';

const sinPercepcion = { totalSemestre: 0, mesesPercibidos: 0 };

describe('remuneración variable — regla de regularidad (D.S. 005-2002-TR)', () => {
  it('la ley fija el umbral en 3 meses y el divisor en 6', () => {
    expect(MESES_MINIMOS_REGULARIDAD).toBe(3);
    expect(DIVISOR_PROMEDIO_SEMESTRE).toBe(6);
  });

  it('divide entre SEIS, no entre los meses percibidos', () => {
    expect(
      promedioComputableVariable({ totalSemestre: 1200, mesesPercibidos: 4 }),
    ).toBe(200);
  });

  it('con 3 meses de percepción ya es remuneración regular', () => {
    expect(
      promedioComputableVariable({ totalSemestre: 900, mesesPercibidos: 3 }),
    ).toBe(150);
  });

  it('con 2 meses no es regular: no computa', () => {
    expect(
      promedioComputableVariable({ totalSemestre: 900, mesesPercibidos: 2 }),
    ).toBe(0);
  });

  it('sin dato del semestre no se presume percepción alguna', () => {
    expect(promedioComputableVariable(undefined)).toBe(0);
    expect(promedioComputableVariables(undefined)).toBe(0);
  });

  it('un total negativo o cero nunca resta de la computable', () => {
    expect(
      promedioComputableVariable({ totalSemestre: -500, mesesPercibidos: 6 }),
    ).toBe(0);
  });

  it('redondea el promedio a dos decimales', () => {
    expect(
      promedioComputableVariable({ totalSemestre: 1111.5, mesesPercibidos: 6 }),
    ).toBe(185.25);
    expect(
      promedioComputableVariable({ totalSemestre: 788.46, mesesPercibidos: 6 }),
    ).toBe(131.41);
  });

  it('cada concepto pasa el umbral por separado', () => {
    const total = promedioComputableVariables({
      horasExtras: { totalSemestre: 1200, mesesPercibidos: 4 },
      comisiones: sinPercepcion,
      // Una sola bonificación en el semestre NO es regular: no suma.
      bonificaciones: { totalSemestre: 600, mesesPercibidos: 1 },
    });
    expect(total).toBe(200);
  });

  it('suma los conceptos que sí son regulares', () => {
    const total = promedioComputableVariables({
      horasExtras: { totalSemestre: 1200, mesesPercibidos: 4 },
      comisiones: { totalSemestre: 300, mesesPercibidos: 3 },
      bonificaciones: sinPercepcion,
    });
    expect(total).toBe(250);
  });
});
