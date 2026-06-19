import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  IsEmail,
  Matches,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^[0-9]+$/, { message: 'El RUC debe contener solo números' })
  ruc: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  razon_social: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_comercial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contacto_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contacto_telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  contacto_email?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
