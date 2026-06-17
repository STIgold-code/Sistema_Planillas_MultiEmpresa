import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email del usuario (se convierte a minúsculas)',
    example: 'usuario@empresa.com',
    maxLength: 150,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @MaxLength(150, { message: 'El email no puede exceder 150 caracteres' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres (límite bcrypt)',
  })
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez García',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, {
    message:
      'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  nombre_completo: string;

  @ApiProperty({
    description: 'ID del rol a asignar al usuario',
    example: 1,
  })
  @IsInt({ message: 'ID de rol inválido' })
  @Type(() => Number)
  @IsNotEmpty({ message: 'El rol es requerido' })
  rol_id: number;

  @ApiPropertyOptional({
    description: 'Estado activo del usuario',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
