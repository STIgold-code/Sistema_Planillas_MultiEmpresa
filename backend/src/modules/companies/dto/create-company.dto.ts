import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  Length,
} from 'class-validator';

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
}
