import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 dígitos' })
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
