import {
  resolverRegimenLaboral,
  mapearRegimenPrisma,
} from './resolver-regimen-laboral';
import { RegimenLaboral } from '../dominio/tipos';

describe('resolverRegimenLaboral', () => {
  it('usa el régimen del contrato cuando está presente (override de empresa)', () => {
    const regimen = resolverRegimenLaboral(
      { regimen_laboral: 'CONSTRUCCION_CIVIL' },
      { regimen_laboral_default: 'GENERAL' },
    );
    expect(regimen).toBe(RegimenLaboral.CONSTRUCCION_CIVIL);
  });

  it('cae al default de la empresa cuando el contrato no especifica régimen', () => {
    const regimen = resolverRegimenLaboral(
      { regimen_laboral: null },
      { regimen_laboral_default: 'AGRARIO' },
    );
    expect(regimen).toBe(RegimenLaboral.AGRARIO);
  });

  it('cae al default de la empresa cuando no hay contrato', () => {
    const regimen = resolverRegimenLaboral(null, {
      regimen_laboral_default: 'PEQUENA_EMPRESA',
    });
    expect(regimen).toBe(RegimenLaboral.PEQUENA_EMPRESA);
  });

  it('mapea cada miembro Prisma al dominio 1:1', () => {
    expect(mapearRegimenPrisma('GENERAL')).toBe(RegimenLaboral.GENERAL);
    expect(mapearRegimenPrisma('MICROEMPRESA')).toBe(
      RegimenLaboral.MICROEMPRESA,
    );
    expect(mapearRegimenPrisma('HOGAR')).toBe(RegimenLaboral.HOGAR);
  });
});
