import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsEnum,
  Length,
} from 'class-validator';
import { RegimenLaboral } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'El RUC es requerido' })
  @Length(11, 11, { message: 'El RUC debe tener 11 dígitos' })
  ruc: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es requerida' })
  razon_social: string;

  @IsString()
  @IsOptional()
  nombre_comercial?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  // Régimen laboral por defecto de la empresa. Opcional: si no se envía, el
  // schema aplica GENERAL. Los contratos sin override heredan este valor.
  @IsEnum(RegimenLaboral, {
    message: 'El régimen laboral por defecto no es válido',
  })
  @IsOptional()
  regimen_laboral_default?: RegimenLaboral;
}
