import {
  calcularGratiAgraria,
  calcularCtsAgraria,
  CLAVE_GRATI_AGRARIO,
  CLAVE_CTS_AGRARIO,
  EntradaBeneficiosAgrario,
} from './beneficios-agrario-separado';

const base = (
  overrides: Partial<EntradaBeneficiosAgrario> = {},
): EntradaBeneficiosAgrario => ({
  remuneracionBasica: 1500,
  gratiPctRb: 0.1666,
  ctsPctRb: 0.0972,
  ...overrides,
});

describe('beneficios-agrario-separado', () => {
  it('gratificacion agraria = 16.66% de la RB', () => {
    // 1500 * 0.1666 = 249.90
    const r = calcularGratiAgraria(base());
    expect(r.conceptos[0]?.clave).toBe(CLAVE_GRATI_AGRARIO);
    expect(r.conceptos[0]?.monto).toBe(249.9);
  });

  it('CTS agraria = 9.72% de la RB', () => {
    // 1500 * 0.0972 = 145.80
    const r = calcularCtsAgraria(base());
    expect(r.conceptos[0]?.clave).toBe(CLAVE_CTS_AGRARIO);
    expect(r.conceptos[0]?.monto).toBe(145.8);
  });

  it('RB 0 no genera beneficios', () => {
    expect(
      calcularGratiAgraria(base({ remuneracionBasica: 0 })).conceptos,
    ).toHaveLength(0);
    expect(
      calcularCtsAgraria(base({ remuneracionBasica: 0 })).conceptos,
    ).toHaveLength(0);
  });
});
