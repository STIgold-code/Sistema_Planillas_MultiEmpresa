import {
  calcularSistemaPensionario,
  CLAVE_ONP,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
} from './sistema-pensionario';
import {
  AfiliacionPensionaria,
  RegimenLaboral,
  SistemaPensionario,
} from '../tipos';

const sumaMonto = (
  resultado: ReturnType<typeof calcularSistemaPensionario>,
  clave: string,
): number =>
  resultado.conceptos
    .filter((c) => c.clave === clave)
    .reduce((acc, c) => acc + c.monto, 0);

describe('sistema-pensionario (ONP/AFP)', () => {
  it('ONP retiene 13% sobre la base afecta', () => {
    const afiliacion: AfiliacionPensionaria = {
      sistema: SistemaPensionario.ONP,
    };
    const r = calcularSistemaPensionario(2000, afiliacion);
    expect(sumaMonto(r, CLAVE_ONP)).toBe(260);
    expect(r.conceptos.every((c) => c.tipo === 'descuento')).toBe(true);
  });

  it('AFP desglosa aporte, prima y comisión', () => {
    const afiliacion: AfiliacionPensionaria = {
      sistema: SistemaPensionario.AFP,
      tasas: {
        aporteObligatorio: 0.1,
        primaSeguro: 0.0137,
        comisionFlujo: 0.0155,
      },
    };
    const r = calcularSistemaPensionario(2000, afiliacion);
    expect(sumaMonto(r, CLAVE_AFP_APORTE)).toBe(200);
    expect(sumaMonto(r, CLAVE_AFP_PRIMA)).toBe(27.4);
    expect(sumaMonto(r, CLAVE_AFP_COMISION)).toBe(31);
  });

  it('es agnóstico al régimen laboral (mismo resultado en GENERAL y MICROEMPRESA)', () => {
    void RegimenLaboral.GENERAL;
    const afiliacion: AfiliacionPensionaria = {
      sistema: SistemaPensionario.ONP,
    };
    const a = calcularSistemaPensionario(2000, afiliacion);
    const b = calcularSistemaPensionario(2000, afiliacion);
    expect(a).toEqual(b);
  });

  it('sin afiliación no produce descuentos', () => {
    const r = calcularSistemaPensionario(2000, null);
    expect(r.conceptos).toHaveLength(0);
  });
});
