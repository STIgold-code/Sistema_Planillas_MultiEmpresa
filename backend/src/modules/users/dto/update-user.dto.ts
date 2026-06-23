import {
  IsEmail,
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
  IsNotEmpty,
} from 'class-validator';
// MinLength y Matches se usan solo para nombre_completo
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Email del usuario (se convierte a minúsculas)',
    example: 'usuario@empresa.com',
    maxLength: 150,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(150, { message: 'El email no puede exceder 150 caracteres' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Nueva contraseña del usuario',
    example: 'password123',
    maxLength: 72,
  })
  @IsString()
  @MaxLength(72, {
    message: 'La contraseña no puede exceder 72 caracteres (límite bcrypt)',
  })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez García',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, {
    message:
      'El nombre solo puede contener letras, espacios, apóstrofes y guiones',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsOptional()
  nombre_completo?: string;

  @ApiPropertyOptional({
    description: 'ID del rol a asignar al usuario',
    example: 1,
  })
  @IsInt({ message: 'ID de rol inválido' })
  @Type(() => Number)
  @IsOptional()
  rol_id?: number;

  @ApiPropertyOptional({
    description: 'Estado activo del usuario',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
