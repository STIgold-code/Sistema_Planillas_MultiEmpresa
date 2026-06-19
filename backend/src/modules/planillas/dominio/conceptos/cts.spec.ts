import { calcularCts, CLAVE_CTS } from './cts';

describe('cts (D.S. 001-97-TR)', () => {
  it('deposita un sueldo por semestre completo incluyendo 1/6 de gratificación', () => {
    // remComputable = 3000 + 500 = 3500; (3500/12)*6 = 1750
    const r = calcularCts({
      mes: 11,
      remuneracionComputable: 3000,
      sextoGratificacion: 500,
      mesesCts: 6,
      diasCts: 0,
    });
    const cts = r.conceptos.find((c) => c.clave === CLAVE_CTS);
    expect(cts?.monto).toBe(1750);
    expect(cts?.tipo).toBe('ingreso');
  });

  it('suma la fracción diaria (rc/360)*días', () => {
    // rc = 1200 + 0 = 1200; (1200/12)*5 + (1200/360)*15 = 500 + 50 = 550
    const r = calcularCts({
      mes: 5,
      remuneracionComputable: 1200,
      sextoGratificacion: 0,
      mesesCts: 5,
      diasCts: 15,
    });
    expect(r.conceptos.find((c) => c.clave === CLAVE_CTS)?.monto).toBe(550);
  });

  it('no deposita fuera de mayo/noviembre', () => {
    const r = calcularCts({
      mes: 7,
      remuneracionComputable: 3000,
      sextoGratificacion: 500,
      mesesCts: 6,
      diasCts: 0,
    });
    expect(r.conceptos).toHaveLength(0);
  });
});
