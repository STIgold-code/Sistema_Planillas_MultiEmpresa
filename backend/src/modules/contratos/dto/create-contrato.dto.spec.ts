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

describe('CreateContratoDto - rango de años en fechas', () => {
  const baseDto = {
    empleado_id: 1,
    tipo_contrato: 'PLAZO_FIJO',
    fecha_inicio: '2025-01-01',
  };

  const anioMaximo = new Date().getFullYear() + 10;

  const erroresDe = async (
    payload: Record<string, unknown>,
    propiedad: string,
  ) => {
    const dto = plainToInstance(CreateContratoDto, payload);
    const errores = await validate(dto);
    return errores.filter((e) => e.property === propiedad);
  };

  it('acepta una fecha de inicio dentro del rango operativo', async () => {
    const errores = await erroresDe(baseDto, 'fecha_inicio');
    expect(errores).toHaveLength(0);
  });

  it('acepta una fecha de fin futura dentro de la ventana permitida', async () => {
    const errores = await erroresDe(
      { ...baseDto, fecha_fin: `${anioMaximo}-12-31` },
      'fecha_fin',
    );
    expect(errores).toHaveLength(0);
  });

  it('rechaza una fecha de inicio con año posterior al máximo permitido', async () => {
    const errores = await erroresDe(
      { ...baseDto, fecha_inicio: '2926-10-18' },
      'fecha_inicio',
    );
    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('isRealisticFutureDate');
  });

  it('rechaza una fecha de inicio con año anterior al mínimo permitido', async () => {
    const errores = await erroresDe(
      { ...baseDto, fecha_inicio: '0026-01-29' },
      'fecha_inicio',
    );
    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('isRealisticFutureDate');
  });

  it('rechaza una fecha de fin con año fuera de rango', async () => {
    const errores = await erroresDe(
      { ...baseDto, fecha_fin: `${anioMaximo + 1}-01-01` },
      'fecha_fin',
    );
    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('isRealisticFutureDate');
  });

  it('no valida el año cuando la fecha de fin se omite', async () => {
    const errores = await erroresDe(baseDto, 'fecha_fin');
    expect(errores).toHaveLength(0);
  });
});
