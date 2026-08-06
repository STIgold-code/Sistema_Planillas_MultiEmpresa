import {
  calcularVentanaPeriodo,
  diasDelPeriodo,
  fechaDeDia,
  diaDeFecha,
} from './ventana-periodo';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('calcularVentanaPeriodo', () => {
  it('sin corte: mes calendario completo', () => {
    const v = calcularVentanaPeriodo(2026, 7, null);
    expect(iso(v.fechaInicio)).toBe('2026-07-01');
    expect(iso(v.fechaFin)).toBe('2026-07-31');
    expect(diasDelPeriodo(v.fechaInicio, v.fechaFin)).toBe(31);
  });

  it('sin corte: febrero no bisiesto', () => {
    const v = calcularVentanaPeriodo(2026, 2, undefined);
    expect(iso(v.fechaFin)).toBe('2026-02-28');
    expect(diasDelPeriodo(v.fechaInicio, v.fechaFin)).toBe(28);
  });

  it('corte 25: julio = 26-jun a 25-jul (30 días exactos)', () => {
    const v = calcularVentanaPeriodo(2026, 7, 25);
    expect(iso(v.fechaInicio)).toBe('2026-06-26');
    expect(iso(v.fechaFin)).toBe('2026-07-25');
    expect(diasDelPeriodo(v.fechaInicio, v.fechaFin)).toBe(30);
  });

  it('corte 25: enero cruza el año (26-dic-2025 a 25-ene-2026)', () => {
    const v = calcularVentanaPeriodo(2026, 1, 25);
    expect(iso(v.fechaInicio)).toBe('2025-12-26');
    expect(iso(v.fechaFin)).toBe('2026-01-25');
  });

  it('corte 25: marzo incluye el paso por febrero (26-feb a 25-mar = 28 días en no bisiesto)', () => {
    const v = calcularVentanaPeriodo(2026, 3, 25);
    expect(iso(v.fechaInicio)).toBe('2026-02-26');
    expect(iso(v.fechaFin)).toBe('2026-03-25');
    expect(diasDelPeriodo(v.fechaInicio, v.fechaFin)).toBe(28);
  });
});

describe('fechaDeDia / diaDeFecha', () => {
  const v = calcularVentanaPeriodo(2026, 7, 25); // 26-jun..25-jul

  it('el día 1 es el inicio de la ventana y el día N el corte', () => {
    expect(iso(fechaDeDia(v.fechaInicio, 1))).toBe('2026-06-26');
    expect(iso(fechaDeDia(v.fechaInicio, 5))).toBe('2026-06-30');
    expect(iso(fechaDeDia(v.fechaInicio, 6))).toBe('2026-07-01');
    expect(iso(fechaDeDia(v.fechaInicio, 30))).toBe('2026-07-25');
  });

  it('diaDeFecha es la inversa de fechaDeDia y detecta fechas fuera de la ventana', () => {
    expect(diaDeFecha(v.fechaInicio, v.fechaFin, new Date(2026, 5, 26))).toBe(
      1,
    );
    expect(diaDeFecha(v.fechaInicio, v.fechaFin, new Date(2026, 6, 25))).toBe(
      30,
    );
    expect(
      diaDeFecha(v.fechaInicio, v.fechaFin, new Date(2026, 6, 26)),
    ).toBeNull();
    expect(
      diaDeFecha(v.fechaInicio, v.fechaFin, new Date(2026, 5, 25)),
    ).toBeNull();
  });

  it('en período calendario el ordinal coincide con el día del mes (compatibilidad histórica)', () => {
    const cal = calcularVentanaPeriodo(2026, 7, null);
    expect(iso(fechaDeDia(cal.fechaInicio, 15))).toBe('2026-07-15');
    expect(
      diaDeFecha(cal.fechaInicio, cal.fechaFin, new Date(2026, 6, 15)),
    ).toBe(15);
  });
});
