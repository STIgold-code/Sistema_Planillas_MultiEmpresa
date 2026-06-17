import { calcularSaludEmpleador, CLAVE_ESSALUD } from './salud-empleador';

describe('salud-empleador (EsSalud 9%)', () => {
  it('aporta el 9% de la remuneración afecta cuando supera la RMV', () => {
    const r = calcularSaludEmpleador({
      remuneracionAfecta: 3000,
      rmv: 1130,
      essaludTasa: 0.09,
      essaludMinimo: 101.7,
    });
    const essalud = r.conceptos.find((c) => c.clave === CLAVE_ESSALUD);
    expect(essalud?.monto).toBe(270);
    expect(essalud?.tipo).toBe('aporte');
  });

  it('aplica el piso (9% de RMV) cuando la afecta es menor a la RMV', () => {
    const r = calcularSaludEmpleador({
      remuneracionAfecta: 800,
      rmv: 1130,
      essaludTasa: 0.09,
      essaludMinimo: 101.7,
    });
    expect(r.conceptos.find((c) => c.clave === CLAVE_ESSALUD)?.monto).toBe(
      101.7,
    );
  });

  it('no aporta cuando no hay remuneración afecta', () => {
    const r = calcularSaludEmpleador({
      remuneracionAfecta: 0,
      rmv: 1130,
      essaludTasa: 0.09,
      essaludMinimo: 101.7,
    });
    expect(r.conceptos).toHaveLength(0);
  });
});
