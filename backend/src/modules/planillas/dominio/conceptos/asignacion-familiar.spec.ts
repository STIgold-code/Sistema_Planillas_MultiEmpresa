import {
  calcularAsignacionFamiliar,
  CLAVE_ASIGNACION_FAMILIAR,
} from './asignacion-familiar';

describe('asignacion-familiar (10% RMV)', () => {
  it('paga el monto plano de asignación familiar cuando el trabajador tiene hijos', () => {
    const r = calcularAsignacionFamiliar(true, 113);
    const af = r.conceptos.find((c) => c.clave === CLAVE_ASIGNACION_FAMILIAR);
    expect(af?.monto).toBe(113);
    expect(af?.tipo).toBe('ingreso');
  });

  it('no paga cuando el trabajador no tiene hijos', () => {
    const r = calcularAsignacionFamiliar(false, 113);
    expect(r.conceptos).toHaveLength(0);
  });
});
