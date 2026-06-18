import {
  crearCalculadoraRegimen,
  RegimenNoSoportadoError,
} from './regimen.factory';
import { RegimenGeneral } from './regimen-general';
import { RegimenPequenaEmpresa } from './regimen-pequena-empresa';
import { RegimenMicroempresa } from './regimen-microempresa';
import { RegimenHogar } from './regimen-hogar';
import { RegimenLaboral } from '../tipos';

describe('regimen.factory', () => {
  it('mapea GENERAL → RegimenGeneral', () => {
    const calc = crearCalculadoraRegimen(RegimenLaboral.GENERAL);
    expect(calc).toBeInstanceOf(RegimenGeneral);
    expect(calc.regimen).toBe(RegimenLaboral.GENERAL);
  });

  it('mapea PEQUENA_EMPRESA → RegimenPequenaEmpresa', () => {
    expect(
      crearCalculadoraRegimen(RegimenLaboral.PEQUENA_EMPRESA),
    ).toBeInstanceOf(RegimenPequenaEmpresa);
  });

  it('mapea MICROEMPRESA → RegimenMicroempresa', () => {
    expect(crearCalculadoraRegimen(RegimenLaboral.MICROEMPRESA)).toBeInstanceOf(
      RegimenMicroempresa,
    );
  });

  it('mapea HOGAR → RegimenHogar', () => {
    expect(crearCalculadoraRegimen(RegimenLaboral.HOGAR)).toBeInstanceOf(
      RegimenHogar,
    );
  });

  it('falla rápido ante un régimen no soportado (AGRARIO aún no registrado)', () => {
    expect(() => crearCalculadoraRegimen(RegimenLaboral.AGRARIO)).toThrow(
      RegimenNoSoportadoError,
    );
  });
});
