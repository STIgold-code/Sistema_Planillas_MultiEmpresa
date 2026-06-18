import {
  calcularProrrateoAgrario,
  remuneracionDiariaProrrateada,
  CLAVE_PRORRATEO_AGRARIO,
} from './prorrateo-agrario';

describe('prorrateo-agrario', () => {
  it('remuneracion diaria = (RB + 16.66%RB + 9.72%RB) / 30', () => {
    // RB 1500: total = 1500 + 249.9 + 145.8 = 1895.7 ; /30 = 63.19
    const diaria = remuneracionDiariaProrrateada({
      remuneracionBasica: 1500,
      gratiPctRb: 0.1666,
      ctsPctRb: 0.0972,
      diasTrabajados: 30,
    });
    expect(Math.round(diaria * 100) / 100).toBe(63.19);
  });

  it('ingreso prorrateado por dias trabajados', () => {
    // diaria 63.19 * 30 dias = ~1895.70
    const r = calcularProrrateoAgrario({
      remuneracionBasica: 1500,
      gratiPctRb: 0.1666,
      ctsPctRb: 0.0972,
      diasTrabajados: 30,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_PRORRATEO_AGRARIO);
    expect(r.conceptos[0]?.monto).toBe(1895.7);
  });

  it('sin dias trabajados no genera ingreso', () => {
    expect(
      calcularProrrateoAgrario({
        remuneracionBasica: 1500,
        gratiPctRb: 0.1666,
        ctsPctRb: 0.0972,
        diasTrabajados: 0,
      }).conceptos,
    ).toHaveLength(0);
  });
});
