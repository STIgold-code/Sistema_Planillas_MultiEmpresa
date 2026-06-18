import {
  calcularCtsConstruccion,
  CLAVE_CTS_CC,
} from './cts-construccion-civil';

describe('cts-construccion-civil', () => {
  it('CTS = 15% del total de jornales basicos', () => {
    // operario 89.30 * 26 dias = 2321.80 ; 15% = 348.27
    const r = calcularCtsConstruccion({
      totalJornalesBasicos: 2321.8,
      ctsPorcentaje: 0.15,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_CTS_CC);
    expect(r.conceptos[0]?.monto).toBe(348.27);
  });

  it('sin jornales percibidos no genera CTS', () => {
    expect(
      calcularCtsConstruccion({ totalJornalesBasicos: 0, ctsPorcentaje: 0.15 })
        .conceptos,
    ).toHaveLength(0);
  });
});
