import { calcularHorasExtras, CLAVE_HE_25, CLAVE_HE_35 } from './horas-extras';
import { ResumenTareo } from '../tipos';

const resumenBase: ResumenTareo = {
  diasTrabajados: 0,
  horasNormales: 0,
  horasExtras25: 0,
  horasExtras35: 0,
  horasExtrasNocturnas25: 0,
  horasExtrasNocturnas35: 0,
  diasNocturnos: 0,
};

const monto = (
  r: ReturnType<typeof calcularHorasExtras>,
  clave: string,
): number =>
  r.conceptos.filter((c) => c.clave === clave).reduce((a, c) => a + c.monto, 0);

describe('horas-extras (D.S. 007-2002-TR)', () => {
  // sueldo 1920 → valor-hora = 1920/30/8 = 8
  const sueldo = 1920;

  it('las primeras 2 horas se pagan a 1.25·H y la 3ra a 1.35·H', () => {
    const r = calcularHorasExtras(sueldo, {
      ...resumenBase,
      horasExtras25: 2,
      horasExtras35: 1,
    });
    // 2h · (8·1.25=10) = 20 ; 1h · (8·1.35=10.8) = 10.8
    expect(monto(r, CLAVE_HE_25)).toBe(20);
    expect(monto(r, CLAVE_HE_35)).toBe(10.8);
    expect(r.conceptos.every((c) => c.tipo === 'ingreso')).toBe(true);
  });

  it('incluye sobretasa nocturna combinada en las HE nocturnas', () => {
    const r = calcularHorasExtras(sueldo, {
      ...resumenBase,
      horasExtrasNocturnas25: 1,
    });
    // 8 · 1.35 (nocturno) · 1.25 = 13.5
    expect(monto(r, CLAVE_HE_25)).toBe(13.5);
  });

  it('sin horas extras no produce conceptos', () => {
    const r = calcularHorasExtras(sueldo, resumenBase);
    expect(r.conceptos).toHaveLength(0);
  });
});
