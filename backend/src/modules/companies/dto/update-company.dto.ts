import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsEnum,
  Matches,
} from 'class-validator';
import { RegimenLaboral } from '@prisma/client';

export class UpdateCompanyDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 dígitos numéricos' })
  @IsOptional()
  ruc?: string;

  @IsString()
  @IsOptional()
  razon_social?: string;

  @IsString()
  @IsOptional()
  nombre_comercial?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'El teléfono debe tener 9 dígitos' })
  telefono?: string;

  @IsString()
  @IsOptional()
  centro_control?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  representante_legal?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni_representante?: string;

  @IsString()
  @IsOptional()
  cargo_representante?: string;

  @IsString()
  @IsOptional()
  partida_electronica?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  firma_representante_url?: string;

  // Régimen laboral por defecto de la empresa.
  @IsEnum(RegimenLaboral, {
    message: 'El régimen laboral por defecto no es válido',
  })
  @IsOptional()
  regimen_laboral_default?: RegimenLaboral;
}
