import {
  calcularFondoCapacitacion,
  CLAVE_FONDO_CAPACITACION,
} from './fondo-capacitacion-construccion';

describe('fondo-capacitacion-construccion', () => {
  it('aporte empleador 0.45% del total de jornales basicos', () => {
    // 2321.80 * 0.0045 = 10.4481 -> 10.45
    const r = calcularFondoCapacitacion({
      totalJornalesBasicos: 2321.8,
      fondoCapacitacionPorcentaje: 0.0045,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_FONDO_CAPACITACION);
    expect(r.conceptos[0]?.tipo).toBe('aporte');
    expect(r.conceptos[0]?.monto).toBe(10.45);
  });

  it('sin jornales no genera aporte', () => {
    expect(
      calcularFondoCapacitacion({
        totalJornalesBasicos: 0,
        fondoCapacitacionPorcentaje: 0.0045,
      }).conceptos,
    ).toHaveLength(0);
  });
});
