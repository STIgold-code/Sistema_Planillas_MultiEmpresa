import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegimenLaboral } from '@prisma/client';
import { CreateCompanyDto } from './create-company.dto';

describe('CreateCompanyDto - regimen_laboral_default', () => {
  const baseDto = {
    ruc: '12345678901',
    razon_social: 'Empresa Test',
  };

  const findRegimenErrors = async (payload: Record<string, unknown>) => {
    const dto = plainToInstance(CreateCompanyDto, payload);
    const errors = await validate(dto);
    return errors.filter((e) => e.property === 'regimen_laboral_default');
  };

  it('acepta un régimen laboral por defecto válido del enum', async () => {
    const errores = await findRegimenErrors({
      ...baseDto,
      regimen_laboral_default: RegimenLaboral.MICROEMPRESA,
    });
    expect(errores).toHaveLength(0);
  });

  it('es opcional: se admite la ausencia del campo (aplica default del schema)', async () => {
    const errores = await findRegimenErrors({ ...baseDto });
    expect(errores).toHaveLength(0);
  });

  it('rechaza un valor que no pertenece al enum', async () => {
    const errores = await findRegimenErrors({
      ...baseDto,
      regimen_laboral_default: 'NO_EXISTE',
    });
    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('isEnum');
  });
});
