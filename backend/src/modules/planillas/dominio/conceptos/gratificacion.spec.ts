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
