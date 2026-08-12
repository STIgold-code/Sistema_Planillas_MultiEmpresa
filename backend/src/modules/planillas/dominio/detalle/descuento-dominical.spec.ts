/**
 * D.L. 713 art. 4 — el dominical se paga en forma directamente proporcional a
 * los días efectivamente trabajados de la semana. Las ausencias sin goce lo
 * recortan en SEXTOS; los subsidios y las licencias con goce NO (asimilados a
 * días efectivamente trabajados, D.S. 012-92-TR art. 4).
 *
 * Junio 2026 arranca lunes 01, así que las semanas calendario son
 * 01-07, 08-14, 15-21, 22-28 y 29-jun al 05-jul.
 */
import {
  calcularDescuentoDominical,
  resumirSemanasDominical,
} from './descuento-dominical';
import { DiaTareoDetalle } from './tipos-detalle';

/** Día de junio 2026 con el código indicado. */
function dia(diaDeJunio: number, codigo = 'A'): DiaTareoDetalle {
  const esAusencia = codigo !== 'A';
  return {
    fecha: new Date(2026, 5, diaDeJunio),
    codigo,
    esLaborable: true,
    esFeriadoTrabajado: false,
    horasDiurnas: esAusencia ? 0 : 8,
    horasNocturnas: 0,
    horasDetalle: esAusencia ? 0 : 8,
    horasDefault: 8,
  };
}

/** Mes de junio 2026 completo (30 días) con los códigos que se le pasen. */
function junio2026(
  codigosPorDia: Record<number, string> = {},
): DiaTareoDetalle[] {
  return Array.from({ length: 30 }, (_, i) =>
    dia(i + 1, codigosPorDia[i + 1] ?? 'A'),
  );
}

const VALOR_DIA = 100; // sueldo 3000 / 30

describe('calcularDescuentoDominical (D.L. 713 art. 4)', () => {
  it('sin ausencias sin goce no descuenta nada (regresión: mes limpio intacto)', () => {
    expect(calcularDescuentoDominical(junio2026(), VALOR_DIA)).toBe(0);
  });

  it('una falta en la semana recorta un sexto del dominical', () => {
    // 1 falta el miércoles 03-jun → 100 × 1/6 = 16.67
    expect(calcularDescuentoDominical(junio2026({ 3: 'F' }), VALOR_DIA)).toBe(
      16.67,
    );
  });

  it('dos faltas en la MISMA semana recortan dos sextos', () => {
    // 03-jun y 05-jun caen en la semana del 01 al 07 → 100 × 2/6 = 33.33
    expect(
      calcularDescuentoDominical(junio2026({ 3: 'F', 5: 'F' }), VALOR_DIA),
    ).toBe(33.33);
  });

  it('dos faltas en semanas DISTINTAS recortan un sexto cada una', () => {
    // 03-jun (semana 01-07) y 10-jun (semana 08-14) → 100 × (1/6 + 1/6)
    expect(
      calcularDescuentoDominical(junio2026({ 3: 'F', 10: 'F' }), VALOR_DIA),
    ).toBe(33.33);
  });

  it('el subsidio de la misma semana NO recorta: solo la falta lo hace', () => {
    // 03-jun falta + 04-jun descanso médico → sigue siendo 1/6, no 2/6.
    expect(
      calcularDescuentoDominical(junio2026({ 3: 'F', 4: 'DM' }), VALOR_DIA),
    ).toBe(16.67);
  });

  it('suspensión (S/SUS) y licencia sin goce (LSG) también recortan', () => {
    expect(calcularDescuentoDominical(junio2026({ 3: 'S' }), VALOR_DIA)).toBe(
      16.67,
    );
    expect(calcularDescuentoDominical(junio2026({ 3: 'SUS' }), VALOR_DIA)).toBe(
      16.67,
    );
    expect(calcularDescuentoDominical(junio2026({ 3: 'LSG' }), VALOR_DIA)).toBe(
      16.67,
    );
  });

  it('vacaciones, licencias con goce y subsidios no recortan nunca', () => {
    const dias = junio2026({
      2: 'V',
      3: 'DM',
      4: 'SI',
      5: 'SM',
      8: 'LF',
      9: 'LP',
      10: 'LCG',
    });
    expect(calcularDescuentoDominical(dias, VALOR_DIA)).toBe(0);
  });

  it('nunca descuenta más de UN dominical por semana', () => {
    // Semana 01-07 entera ausente (7 días) → tope 1 dominical, no 7/6.
    const dias = junio2026({
      1: 'F',
      2: 'F',
      3: 'F',
      4: 'F',
      5: 'F',
      6: 'F',
      7: 'F',
    });
    expect(calcularDescuentoDominical(dias, VALOR_DIA)).toBe(100);
  });

  it('una semana partida en el borde del período solo cuenta sus días presentes', () => {
    // Ventana 26-jun → 25-jul: la semana del 22 al 28 de junio entra al período
    // solo con 26, 27 y 28. Una falta el 26 recorta 1/6, no más.
    const dias = [dia(26, 'F'), dia(27), dia(28)];
    expect(calcularDescuentoDominical(dias, VALOR_DIA)).toBe(16.67);
  });

  it('agrupa por semana calendario lunes→domingo', () => {
    // 07-jun es DOMINGO (cierra la semana del 01); 08-jun es LUNES (abre otra).
    const semanas = resumirSemanasDominical(junio2026({ 7: 'F', 8: 'F' }));
    expect(semanas).toHaveLength(2);
    expect(semanas[0].lunes).toEqual(new Date(2026, 5, 1));
    expect(semanas[1].lunes).toEqual(new Date(2026, 5, 8));
  });

  it('con valor de día 0 no descuenta (empleado sin días devengados)', () => {
    expect(calcularDescuentoDominical(junio2026({ 3: 'F' }), 0)).toBe(0);
  });
});
