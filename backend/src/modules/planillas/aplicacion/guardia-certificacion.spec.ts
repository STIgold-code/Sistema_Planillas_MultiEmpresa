import {
  asegurarRegimenCertificado,
  RegimenNoCertificadoError,
} from './guardia-certificacion';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { RegimenLaboral } from '../dominio/tipos';

describe('asegurarRegimenCertificado', () => {
  it('no lanza para un régimen certificado (GENERAL)', () => {
    const calc = crearCalculadoraRegimen(RegimenLaboral.GENERAL);
    expect(() => asegurarRegimenCertificado(calc)).not.toThrow();
  });

  it('lanza RegimenNoCertificadoError para AGRARIO (no certificado)', () => {
    const calc = crearCalculadoraRegimen(RegimenLaboral.AGRARIO);
    expect(() => asegurarRegimenCertificado(calc)).toThrow(
      RegimenNoCertificadoError,
    );
  });

  it('lanza RegimenNoCertificadoError para CONSTRUCCION_CIVIL (no certificado)', () => {
    const calc = crearCalculadoraRegimen(RegimenLaboral.CONSTRUCCION_CIVIL);
    expect(() => asegurarRegimenCertificado(calc)).toThrow(
      RegimenNoCertificadoError,
    );
  });
});
