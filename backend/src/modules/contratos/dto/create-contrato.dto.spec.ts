import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegimenLaboral } from '@prisma/client';
import { CreateContratoDto } from './create-contrato.dto';

describe('CreateContratoDto - regimen_laboral', () => {
  const baseDto = {
    empleado_id: 1,
    tipo_contrato: 'PLAZO_FIJO',
    fecha_inicio: '2025-01-01',
  };

  const findRegimenErrors = async (payload: Record<string, unknown>) => {
    const dto = plainToInstance(CreateContratoDto, payload);
    const errors = await validate(dto);
    return errors.filter((e) => e.property === 'regimen_laboral');
  };

  it('acepta un régimen laboral válido del enum', async () => {
    const errores = await findRegimenErrors({
      ...baseDto,
      regimen_laboral: RegimenLaboral.PEQUENA_EMPRESA,
    });
    expect(errores).toHaveLength(0);
  });

  it('es opcional: se admite la ausencia del campo', async () => {
    const errores = await findRegimenErrors({ ...baseDto });
    expect(errores).toHaveLength(0);
  });

  it('rechaza un valor que no pertenece al enum', async () => {
    const errores = await findRegimenErrors({
      ...baseDto,
      regimen_laboral: 'REGIMEN_INEXISTENTE',
    });
    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('isEnum');
  });
});
