import { calcularVacaciones, CLAVE_VACACIONES } from './vacaciones';

describe('vacaciones (descanso vacacional gozado)', () => {
  it('paga (sueldo/30)·días por los días de vacaciones gozados en el período', () => {
    const r = calcularVacaciones(3000, 10);
    const vac = r.conceptos.find((c) => c.clave === CLAVE_VACACIONES);
    expect(vac?.monto).toBe(1000);
    expect(vac?.tipo).toBe('ingreso');
  });

  it('no genera concepto cuando no hay días de vacaciones en el período', () => {
    const r = calcularVacaciones(3000, 0);
    expect(r.conceptos).toHaveLength(0);
  });
});
