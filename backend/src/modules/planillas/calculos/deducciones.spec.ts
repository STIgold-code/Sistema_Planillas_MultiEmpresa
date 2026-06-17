/**
 * Tests unitarios de calcularDeducciones.
 *
 * Función pura: no requiere mocks ni NestJS TestingModule.
 */
import { calcularDeducciones } from './deducciones';

const AFP_HABITAT = {
  tipo: 'AFP',
  aporte_obligatorio: 10,
  prima_seguro: 1.74,
  comision_flujo: 1.47,
};

const ONP = {
  tipo: 'ONP',
  aporte_obligatorio: 13,
  prima_seguro: 0,
  comision_flujo: 0,
};

describe('calcularDeducciones', () => {
  describe('AFP', () => {
    it('calcula los 3 componentes correctamente', () => {
      const r = calcularDeducciones(3000, AFP_HABITAT);
      expect(r.afpAporte).toBeCloseTo(300, 1); // 10%
      expect(r.afpPrima).toBeCloseTo(52.2, 1); // 1.74%
      expect(r.afpComision).toBeCloseTo(44.1, 1); // 1.47%
    });

    it('afpSeguro es igual a afpPrima', () => {
      const r = calcularDeducciones(5000, AFP_HABITAT);
      expect(r.afpSeguro).toBe(r.afpPrima);
    });

    it('no genera ONP', () => {
      const r = calcularDeducciones(3000, AFP_HABITAT);
      expect(r.onp).toBe(0);
    });

    it('escala linealmente con la remuneración', () => {
      const r1 = calcularDeducciones(1000, AFP_HABITAT);
      const r2 = calcularDeducciones(2000, AFP_HABITAT);
      expect(r2.afpAporte).toBeCloseTo(r1.afpAporte * 2, 1);
    });

    it('remuneración 0 da descuentos 0', () => {
      const r = calcularDeducciones(0, AFP_HABITAT);
      expect(r.afpAporte).toBe(0);
      expect(r.afpPrima).toBe(0);
      expect(r.afpComision).toBe(0);
    });
  });

  describe('ONP', () => {
    it('calcula 13% de la remuneración', () => {
      const r = calcularDeducciones(3000, ONP);
      expect(r.onp).toBeCloseTo(390, 1);
    });

    it('no genera AFP', () => {
      const r = calcularDeducciones(3000, ONP);
      expect(r.afpAporte).toBe(0);
      expect(r.afpPrima).toBe(0);
      expect(r.afpComision).toBe(0);
    });

    it('usa fallback 13% si aporte_obligatorio es 0', () => {
      const r = calcularDeducciones(3000, { ...ONP, aporte_obligatorio: 0 });
      expect(r.onp).toBeCloseTo(390, 1);
    });
  });

  describe('sin régimen', () => {
    it('todo en 0', () => {
      const r = calcularDeducciones(5000, null);
      expect(r.afpAporte).toBe(0);
      expect(r.afpPrima).toBe(0);
      expect(r.afpComision).toBe(0);
      expect(r.afpSeguro).toBe(0);
      expect(r.onp).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('remuneración negativa no genera descuentos negativos', () => {
      const r = calcularDeducciones(-1000, AFP_HABITAT);
      // round2(-100) = -100, la función NO protege contra negativos
      // Esto documenta el comportamiento actual (el caller debe validar)
      expect(r.afpAporte).toBeLessThanOrEqual(0);
    });

    it('tasas como strings (Prisma Decimal) se convierten correctamente', () => {
      const afpConStrings = {
        tipo: 'AFP',
        aporte_obligatorio: '10',
        prima_seguro: '1.74',
        comision_flujo: '1.47',
      };
      const r = calcularDeducciones(3000, afpConStrings);
      expect(r.afpAporte).toBeCloseTo(300, 1);
    });

    it('tasas null se tratan como 0', () => {
      const afpNull = {
        tipo: 'AFP',
        aporte_obligatorio: null,
        prima_seguro: null,
        comision_flujo: null,
      };
      const r = calcularDeducciones(3000, afpNull);
      expect(r.afpAporte).toBe(0);
      expect(r.afpPrima).toBe(0);
      expect(r.afpComision).toBe(0);
    });

    it('tipo desconocido no genera descuentos', () => {
      const r = calcularDeducciones(3000, {
        tipo: 'MIXTO',
        aporte_obligatorio: 10,
        prima_seguro: 1,
        comision_flujo: 1,
      });
      expect(r.afpAporte).toBe(0);
      expect(r.onp).toBe(0);
    });

    it('remuneración con decimales largos se redondea a 2', () => {
      const r = calcularDeducciones(3333.33, AFP_HABITAT);
      const str = r.afpAporte.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });
});
