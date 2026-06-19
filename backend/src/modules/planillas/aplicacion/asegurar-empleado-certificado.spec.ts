import { asegurarEmpleadoCertificado } from './asegurar-empleado-certificado';
import { RegimenNoCertificadoError } from './guardia-certificacion';
import { RegimenLaboral as RegimenLaboralPrisma } from '@prisma/client';

describe('asegurarEmpleadoCertificado', () => {
  it('no lanza cuando el contrato es GENERAL (certificado)', () => {
    expect(() =>
      asegurarEmpleadoCertificado({
        contratos: [{ regimen_laboral: RegimenLaboralPrisma.GENERAL }],
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
      }),
    ).not.toThrow();
  });

  it('lanza cuando el contrato es AGRARIO (no certificado)', () => {
    expect(() =>
      asegurarEmpleadoCertificado({
        contratos: [{ regimen_laboral: RegimenLaboralPrisma.AGRARIO }],
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
      }),
    ).toThrow(RegimenNoCertificadoError);
  });

  it('lanza cuando el contrato es CONSTRUCCION_CIVIL (no certificado)', () => {
    expect(() =>
      asegurarEmpleadoCertificado({
        contratos: [
          { regimen_laboral: RegimenLaboralPrisma.CONSTRUCCION_CIVIL },
        ],
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
      }),
    ).toThrow(RegimenNoCertificadoError);
  });

  it('usa el default de la empresa cuando el contrato no especifica régimen', () => {
    expect(() =>
      asegurarEmpleadoCertificado({
        contratos: [{ regimen_laboral: null }],
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.AGRARIO },
      }),
    ).toThrow(RegimenNoCertificadoError);
  });

  it('usa el default de la empresa cuando el empleado no tiene contratos', () => {
    expect(() =>
      asegurarEmpleadoCertificado({
        contratos: [],
        empresa: { regimen_laboral_default: RegimenLaboralPrisma.GENERAL },
      }),
    ).not.toThrow();
  });
});
