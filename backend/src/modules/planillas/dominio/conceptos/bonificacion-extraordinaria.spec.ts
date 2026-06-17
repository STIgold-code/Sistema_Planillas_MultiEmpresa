import {
  calcularBonificacionExtraordinaria,
  CLAVE_BONIF_EXTRAORDINARIA,
} from './bonificacion-extraordinaria';

describe('bonificacion-extraordinaria (Ley 30334)', () => {
  it('paga al trabajador el 9% que el empleador habría aportado a EsSalud sobre la grati', () => {
    const r = calcularBonificacionExtraordinaria(1000, 0.09);
    const bono = r.conceptos.find(
      (c) => c.clave === CLAVE_BONIF_EXTRAORDINARIA,
    );
    expect(bono?.monto).toBe(90);
    expect(bono?.tipo).toBe('ingreso');
  });

  it('usa la tasa EsSalud vigente (p. ej. 6.75% con EPS)', () => {
    const r = calcularBonificacionExtraordinaria(1000, 0.0675);
    expect(
      r.conceptos.find((c) => c.clave === CLAVE_BONIF_EXTRAORDINARIA)?.monto,
    ).toBe(67.5);
  });

  it('no genera bonificación cuando no hay gratificación', () => {
    const r = calcularBonificacionExtraordinaria(0, 0.09);
    expect(r.conceptos).toHaveLength(0);
  });
});
