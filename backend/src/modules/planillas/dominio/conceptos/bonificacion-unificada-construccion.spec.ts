import { calcularBuc, CLAVE_BUC } from './bonificacion-unificada-construccion';

describe('bonificacion-unificada-construccion (BUC)', () => {
  it('operario: 32% del jornal basico por dia trabajado', () => {
    // 89.30 * 0.32 * 26 = 742.94 (redondeado)
    const r = calcularBuc({
      jornalBasicoDiario: 89.3,
      bucPorcentaje: 0.32,
      diasTrabajados: 26,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_BUC);
    expect(r.conceptos[0]?.monto).toBe(742.98);
  });

  it('peon: 30% del jornal basico', () => {
    // 62.80 * 0.30 * 26 = 489.84
    const r = calcularBuc({
      jornalBasicoDiario: 62.8,
      bucPorcentaje: 0.3,
      diasTrabajados: 26,
    });
    expect(r.conceptos[0]?.monto).toBe(489.84);
  });

  it('sin dias trabajados no genera BUC', () => {
    expect(
      calcularBuc({
        jornalBasicoDiario: 89.3,
        bucPorcentaje: 0.32,
        diasTrabajados: 0,
      }).conceptos,
    ).toHaveLength(0);
  });
});
