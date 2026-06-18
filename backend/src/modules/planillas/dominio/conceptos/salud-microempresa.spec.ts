import { calcularSaludMicroempresa, CLAVE_SIS } from './salud-microempresa';

describe('salud-microempresa (SIS semicontributivo)', () => {
  it('aporta el monto fijo SIS, no un porcentaje', () => {
    const r = calcularSaludMicroempresa({
      remuneracionAfecta: 3000,
      sis: 15,
    });
    const sis = r.conceptos.find((c) => c.clave === CLAVE_SIS);
    expect(sis?.monto).toBe(15);
    expect(sis?.tipo).toBe('aporte');
  });

  it('el aporte SIS es independiente de la remuneración (fijo)', () => {
    const r = calcularSaludMicroempresa({
      remuneracionAfecta: 12000,
      sis: 15,
    });
    expect(r.conceptos.find((c) => c.clave === CLAVE_SIS)?.monto).toBe(15);
  });

  it('no aporta cuando no hay remuneración afecta', () => {
    const r = calcularSaludMicroempresa({ remuneracionAfecta: 0, sis: 15 });
    expect(r.conceptos).toHaveLength(0);
  });
});
