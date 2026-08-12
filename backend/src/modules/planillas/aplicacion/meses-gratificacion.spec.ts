/**
 * Tests del resolutor de MESES CALENDARIO COMPLETOS del semestre que devengan
 * la gratificación ordinaria (Ley 27735 art. 6 + D.S. 005-2002-TR art. 3.3-3.4).
 *
 * La ley es la spec: cada caso documenta el supuesto legal que cubre.
 */
import { resolverMesesGratificacion } from './meses-gratificacion';

const fecha = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

describe('resolverMesesGratificacion', () => {
  describe('semestre completo (regresión: nada de lo actual cambia)', () => {
    it('fuera de julio/diciembre no hay gratificación ordinaria → 6 (valor no usado)', () => {
      expect(resolverMesesGratificacion(3, 2026, fecha(2026, 5, 20))).toBe(6);
    });

    it('sin fecha de ingreso registrada no se presume ingreso tardío → 6', () => {
      expect(resolverMesesGratificacion(7, 2026, null)).toBe(6);
      expect(resolverMesesGratificacion(12, 2026, undefined)).toBe(6);
    });

    it('ingreso de años anteriores → 6/6', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2020, 1, 1))).toBe(6);
      expect(resolverMesesGratificacion(12, 2026, fecha(2020, 1, 1))).toBe(6);
    });

    it('ingreso el 01-ene (primer día del semestre de julio) → 6/6', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 1, 1))).toBe(6);
    });

    it('ingreso el 01-jul (primer día del semestre de diciembre) → 6/6', () => {
      expect(resolverMesesGratificacion(12, 2026, fecha(2026, 7, 1))).toBe(6);
    });
  });

  // Ley 27735 art. 6 + D.S. 005-2002-TR art. 3.3: con menos de seis meses la
  // gratificación es proporcional a los MESES CALENDARIO COMPLETOS laborados.
  describe('gratificación de julio (semestre enero-junio)', () => {
    it('ingreso el 01-abr → 3/6 (abr, may, jun)', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 4, 1))).toBe(3);
    });

    // Art. 3.4: la unidad es el mes calendario COMPLETO. Los 17 días de marzo no
    // suman sexto — el reglamento solo usa treintavos para DEDUCIR, no para sumar.
    it('ingreso el 15-mar → 3/6 (marzo incompleto no suma)', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 3, 15))).toBe(3);
    });

    it('ingreso el 01-jun → 1/6', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 6, 1))).toBe(1);
    });

    it('ingreso el 30-jun → 0/6 (ni un mes calendario completo)', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 6, 30))).toBe(0);
    });

    // Art. 3.3 exige al menos un mes calendario completo en el período: quien
    // ingresa el 01-jul no laboró ningún mes del semestre enero-junio.
    it('ingreso el 01-jul → 0/6 (fuera del semestre que devenga)', () => {
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 7, 1))).toBe(0);
    });
  });

  describe('gratificación de diciembre (semestre julio-diciembre)', () => {
    it('ingreso el 01-oct → 3/6 (oct, nov, dic)', () => {
      expect(resolverMesesGratificacion(12, 2026, fecha(2026, 10, 1))).toBe(3);
    });

    it('ingreso el 15-sep → 3/6 (septiembre incompleto no suma)', () => {
      expect(resolverMesesGratificacion(12, 2026, fecha(2026, 9, 15))).toBe(3);
    });

    it('ingreso el 01-dic → 1/6', () => {
      expect(resolverMesesGratificacion(12, 2026, fecha(2026, 12, 1))).toBe(1);
    });

    it('ingreso el 15-dic → 0/6', () => {
      expect(resolverMesesGratificacion(12, 2026, fecha(2026, 12, 15))).toBe(0);
    });
  });

  describe('robustez del borde', () => {
    it('acepta la fecha como string ISO (@db.Date serializado)', () => {
      expect(resolverMesesGratificacion(7, 2026, '2026-04-01')).toBe(3);
      expect(
        resolverMesesGratificacion(7, 2026, '2026-03-15T00:00:00.000Z'),
      ).toBe(3);
    });

    it('nunca devuelve un valor fuera de [0, 6] aunque el dato sea incoherente', () => {
      // Ingreso posterior al propio período (dato sucio): jamás negativo.
      expect(resolverMesesGratificacion(7, 2026, fecha(2026, 9, 1))).toBe(0);
    });
  });
});
