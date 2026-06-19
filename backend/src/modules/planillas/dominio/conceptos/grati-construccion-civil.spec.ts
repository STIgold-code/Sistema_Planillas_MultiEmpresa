import {
  calcularGratiConstruccion,
  CLAVE_GRATI_CC,
  EntradaGratiConstruccion,
} from './grati-construccion-civil';

const base = (
  overrides: Partial<EntradaGratiConstruccion> = {},
): EntradaGratiConstruccion => ({
  mes: 7,
  jornalBasicoDiario: 89.3, // operario 2026
  jornalesPorFiesta: 40,
  mesesDevengados: 7,
  diasObra: 200,
  diasMinimosGrati: 0,
  ...overrides,
});

describe('grati-construccion-civil', () => {
  it('Fiestas Patrias completa = 40 jornales basicos (operario 89.30 -> 3572)', () => {
    const r = calcularGratiConstruccion(base());
    expect(r.conceptos[0]?.clave).toBe(CLAVE_GRATI_CC);
    expect(r.conceptos[0]?.monto).toBe(3572);
  });

  it('Navidad completa = 40 jornales basicos en diciembre', () => {
    const r = calcularGratiConstruccion(base({ mes: 12, mesesDevengados: 5 }));
    expect(r.conceptos[0]?.monto).toBe(3572);
  });

  it('fuera de julio/diciembre no devenga gratificacion', () => {
    expect(calcularGratiConstruccion(base({ mes: 5 })).conceptos).toHaveLength(
      0,
    );
  });

  it('devengue proporcional: 3/7 en Fiestas Patrias', () => {
    const r = calcularGratiConstruccion(base({ mesesDevengados: 3 }));
    // 89.30 * 40 * 3/7 = 1530.857... -> 1530.86
    expect(r.conceptos[0]?.monto).toBe(1530.86);
  });

  // ⚠️ NO CONFIRMADO (d): dias minimos de obra para grati de construccion civil.
  it.skip('PENDIENTE validacion contador: dias minimos de obra para derecho a grati CC', () => {
    // Cuando el contador confirme el requisito de antiguedad minima y el dato
    // diasMinimosGrati deje de ser placeholder 0, este test debe correr en verde.
    const r = calcularGratiConstruccion(
      base({ diasObra: 10, diasMinimosGrati: 30 }),
    );
    expect(r.conceptos).toHaveLength(0);
  });
});
