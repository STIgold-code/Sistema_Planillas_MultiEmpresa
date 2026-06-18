import { calcularSaludAgrario, CLAVE_ESSALUD_AGRARIO } from './salud-agrario';

describe('salud-agrario', () => {
  it('empresa grande: 9% sobre la Remuneracion Basica', () => {
    // RB 1500 * 0.09 = 135
    const r = calcularSaludAgrario({
      remuneracionBasica: 1500,
      essaludTasa: 0.09,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_ESSALUD_AGRARIO);
    expect(r.conceptos[0]?.tipo).toBe('aporte');
    expect(r.conceptos[0]?.monto).toBe(135);
  });

  it('empresa pequena: 6% sobre la Remuneracion Basica (2026)', () => {
    // RB 1500 * 0.06 = 90
    const r = calcularSaludAgrario({
      remuneracionBasica: 1500,
      essaludTasa: 0.06,
    });
    expect(r.conceptos[0]?.monto).toBe(90);
  });

  it('RB 0 no genera aporte', () => {
    expect(
      calcularSaludAgrario({ remuneracionBasica: 0, essaludTasa: 0.09 })
        .conceptos,
    ).toHaveLength(0);
  });
});
