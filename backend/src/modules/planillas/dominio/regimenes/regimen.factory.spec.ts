import {
  crearCalculadoraRegimen,
  RegimenNoSoportadoError,
} from './regimen.factory';
import { RegimenGeneral } from './regimen-general';
import { RegimenLaboral } from '../tipos';

describe('regimen.factory', () => {
  it('mapea GENERAL → RegimenGeneral', () => {
    const calc = crearCalculadoraRegimen(RegimenLaboral.GENERAL);
    expect(calc).toBeInstanceOf(RegimenGeneral);
    expect(calc.regimen).toBe(RegimenLaboral.GENERAL);
  });

  it('falla rápido ante un régimen no soportado (aún no registrado)', () => {
    expect(() => crearCalculadoraRegimen(RegimenLaboral.MICROEMPRESA)).toThrow(
      RegimenNoSoportadoError,
    );
  });
});
