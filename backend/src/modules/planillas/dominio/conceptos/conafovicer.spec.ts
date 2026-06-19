import { calcularConafovicer, CLAVE_CONAFOVICER } from './conafovicer';

describe('conafovicer', () => {
  it('es un DESCUENTO al trabajador del 2% sobre la base', () => {
    const r = calcularConafovicer({
      baseImponible: 2321.8,
      conafovicerPorcentaje: 0.02,
    });
    expect(r.conceptos[0]?.clave).toBe(CLAVE_CONAFOVICER);
    expect(r.conceptos[0]?.tipo).toBe('descuento');
    expect(r.conceptos[0]?.monto).toBe(46.44);
  });

  it('base 0 no genera descuento', () => {
    expect(
      calcularConafovicer({ baseImponible: 0, conafovicerPorcentaje: 0.02 })
        .conceptos,
    ).toHaveLength(0);
  });

  // ⚠️ NO CONFIRMADO (b): base CONAFOVICER jornal basico vs remuneracion total.
  it.skip('PENDIENTE validacion contador: base CONAFOVICER jornal basico vs remuneracion total', () => {
    // Fuentes discrepan entre "jornal basico" y "remuneracion bruta/total".
    // Cuando el contador confirme la base literal de R.M. 197-2025-TR, fijar el
    // valor esperado y quitar el skip. Ejemplo a confirmar (base = total bruto):
    const base = 3000;
    const r = calcularConafovicer({
      baseImponible: base,
      conafovicerPorcentaje: 0.02,
    });
    expect(r.conceptos[0]?.monto).toBe(60);
  });
});
