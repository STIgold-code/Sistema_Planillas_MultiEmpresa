/**
 * Tests unitarios para funciones puras de cálculo de planilla.
 *
 * Estas son las funciones sin dependencias de Prisma, por lo que sirven como
 * primera red de seguridad antes de refactorizar el método `calcular` del servicio.
 *
 * Referencias legales:
 * - Art. 53 Ley del Impuesto a la Renta
 * - Art. 40 Reglamento LIR
 * - D.S. 301-2025-EF (UIT 2026 = S/ 5,500)
 */
import {
  calcularIR5taCategoria,
  round2,
  safeNumber,
  UIT,
  DEDUCCION_7UIT,
  TRAMOS_IR_5TA,
} from './planillas.config';

describe('planillas.config', () => {
  describe('safeNumber', () => {
    it('convierte strings numéricos correctamente', () => {
      expect(safeNumber('1130.50')).toBe(1130.5);
      expect(safeNumber('0')).toBe(0);
    });

    it('devuelve 0 para valores no numéricos', () => {
      expect(safeNumber('abc')).toBe(0);
      expect(safeNumber(null)).toBe(0);
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber(NaN)).toBe(0);
    });

    it('maneja Decimals de Prisma (objetos con toString)', () => {
      const decimalLike = { toString: () => '1500.75' };
      expect(safeNumber(decimalLike)).toBe(1500.75);
    });
  });

  describe('round2', () => {
    it('redondea a 2 decimales', () => {
      expect(round2(10.125)).toBe(10.13);
      expect(round2(10.124)).toBe(10.12);
      expect(round2(1130)).toBe(1130);
    });

    it('devuelve 0 para NaN', () => {
      expect(round2(NaN)).toBe(0);
    });

    it('maneja números negativos', () => {
      expect(round2(-10.125)).toBe(-10.12); // Math.round redondea al más cercano (hacia +Inf en caso de empate)
    });
  });

  describe('calcularIR5taCategoria', () => {
    describe('casos exentos de IR', () => {
      it('devuelve 0 cuando la remuneración es 0', () => {
        expect(calcularIR5taCategoria(0, 1)).toBe(0);
      });

      it('devuelve 0 cuando la remuneración es negativa', () => {
        expect(calcularIR5taCategoria(-100, 1)).toBe(0);
      });

      it('devuelve 0 cuando el sueldo anual proyectado está por debajo de 7 UIT', () => {
        // RMV actual (1130) * 14 meses (12 + 2 gratificaciones) = 15,820
        // 7 UIT = 7 * 5,500 = 38,500
        // 15,820 < 38,500 → no paga IR
        expect(calcularIR5taCategoria(1130, 1)).toBe(0);
      });

      it('devuelve 0 para sueldo justo en el límite (7 UIT anual)', () => {
        // 7 UIT = 38,500 / 14 meses = 2,750 mensual
        // Con exactamente 2,750 → renta anual = 38,500 = deducción → IR = 0
        expect(calcularIR5taCategoria(2750, 1)).toBe(0);
      });
    });

    describe('primer tramo (8% hasta 5 UIT)', () => {
      it('calcula correctamente para sueldo que entra al primer tramo', () => {
        // Sueldo: 3,500/mes
        // Renta proyectada: 3,500 * 14 = 49,000
        // Deducción 7 UIT: 38,500
        // Renta neta: 49,000 - 38,500 = 10,500
        // Como 10,500 <= 5 UIT (27,500): 100% primer tramo
        // IR anual: 10,500 * 0.08 = 840
        // IR mensual: 840 / 12 = 70
        const resultado = calcularIR5taCategoria(3500, 1);
        expect(resultado).toBeCloseTo(70, 2);
      });
    });

    describe('segundo tramo (14% entre 5 y 20 UIT)', () => {
      it('calcula correctamente cuando el ingreso cruza al segundo tramo', () => {
        // Sueldo: 6,000/mes
        // Renta proyectada: 6,000 * 14 = 84,000
        // Deducción: 38,500
        // Renta neta: 84,000 - 38,500 = 45,500
        // Primer tramo (5 UIT = 27,500) * 0.08 = 2,200
        // Segundo tramo: (45,500 - 27,500) = 18,000 * 0.14 = 2,520
        // IR anual: 2,200 + 2,520 = 4,720
        // IR mensual: 4,720 / 12 ≈ 393.33
        const resultado = calcularIR5taCategoria(6000, 1);
        expect(resultado).toBeCloseTo(393.33, 1);
      });
    });

    describe('meses intermedios con retenciones previas', () => {
      it('descuenta retenciones previas y divide entre meses restantes', () => {
        // Sueldo: 5,000/mes - mes 7 (julio)
        // Acumulado anterior: 5,000 * 6 = 30,000 (enero a junio)
        // Renta proyectada desde julio: 30,000 + (5,000 * 6) + 5,000 (grat jul) + 5,000 (grat dic) = 70,000
        // Renta neta: 70,000 - 38,500 = 31,500
        // Primer tramo: 27,500 * 0.08 = 2,200
        // Segundo tramo: 4,000 * 0.14 = 560
        // IR anual: 2,760
        // Si no hubo retenciones previas: 2,760 / 6 meses restantes = 460
        const resultado = calcularIR5taCategoria(5000, 7, 30000, 0);
        expect(resultado).toBeGreaterThan(0);
        expect(resultado).toBeLessThan(600);
      });
    });

    describe('mes 12 (diciembre)', () => {
      it('divide entre 1 mes restante cuando ya es diciembre', () => {
        // Es el último mes, todas las retenciones pendientes se aplican ahí
        const resultado = calcularIR5taCategoria(5000, 12, 55000, 2500);
        expect(resultado).toBeGreaterThanOrEqual(0);
      });
    });

    describe('invariantes del cálculo', () => {
      it('el IR nunca es negativo', () => {
        // Aunque las retenciones previas superen el impuesto anual, el IR no puede ser negativo
        const resultado = calcularIR5taCategoria(3500, 6, 30000, 10000);
        expect(resultado).toBeGreaterThanOrEqual(0);
      });

      it('a mayor sueldo, mayor IR (monotónico)', () => {
        const irMenor = calcularIR5taCategoria(5000, 1);
        const irMayor = calcularIR5taCategoria(10000, 1);
        expect(irMayor).toBeGreaterThan(irMenor);
      });
    });
  });

  describe('constantes legales', () => {
    it('UIT 2026 es 5,500 soles (D.S. 301-2025-EF)', () => {
      // Protege contra cambio accidental de la UIT en configuración
      expect(UIT).toBe(5500);
    });

    it('la deducción fija es 7 UIT', () => {
      expect(DEDUCCION_7UIT).toBe(7);
    });

    it('los tramos de IR están en orden ascendente', () => {
      for (let i = 1; i < TRAMOS_IR_5TA.length; i++) {
        expect(TRAMOS_IR_5TA[i].hasta).toBeGreaterThan(
          TRAMOS_IR_5TA[i - 1].hasta,
        );
      }
    });

    it('los tramos cubren hasta infinito', () => {
      const ultimo = TRAMOS_IR_5TA[TRAMOS_IR_5TA.length - 1];
      expect(ultimo.hasta).toBe(Infinity);
    });
  });
});
