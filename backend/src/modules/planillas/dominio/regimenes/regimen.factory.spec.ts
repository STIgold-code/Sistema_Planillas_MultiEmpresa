import {
  crearCalculadoraRegimen,
  RegimenNoSoportadoError,
} from './regimen.factory';
import { RegimenGeneral } from './regimen-general';
import { RegimenPequenaEmpresa } from './regimen-pequena-empresa';
import { RegimenMicroempresa } from './regimen-microempresa';
import { RegimenHogar } from './regimen-hogar';
import { RegimenAgrario } from './regimen-agrario';
import { RegimenConstruccionCivil } from './regimen-construccion-civil';
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

  it('mapea AGRARIO → RegimenAgrario', () => {
    expect(crearCalculadoraRegimen(RegimenLaboral.AGRARIO)).toBeInstanceOf(
      RegimenAgrario,
    );
  });

  it('mapea CONSTRUCCION_CIVIL → RegimenConstruccionCivil', () => {
    expect(
      crearCalculadoraRegimen(RegimenLaboral.CONSTRUCCION_CIVIL),
    ).toBeInstanceOf(RegimenConstruccionCivil);
  });

  it('falla rápido ante un régimen no soportado', () => {
    const noSoportado = 'INEXISTENTE' as RegimenLaboral;
    expect(() => crearCalculadoraRegimen(noSoportado)).toThrow(
      RegimenNoSoportadoError,
    );
  });

  it('AGRARIO y CONSTRUCCION_CIVIL NO están certificados para producción', () => {
    expect(
      crearCalculadoraRegimen(RegimenLaboral.AGRARIO).certificadoProduccion,
    ).toBe(false);
    expect(
      crearCalculadoraRegimen(RegimenLaboral.CONSTRUCCION_CIVIL)
        .certificadoProduccion,
    ).toBe(false);
  });

  it('los régimenes verificados SÍ están certificados', () => {
    expect(
      crearCalculadoraRegimen(RegimenLaboral.GENERAL).certificadoProduccion,
    ).toBe(true);
  });
});
