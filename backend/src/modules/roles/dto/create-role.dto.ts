import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'Supervisor',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Supervisor de área con acceso a reportes',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description:
      'Lista de códigos de permisos. Solo puede asignar permisos que usted posea.',
    example: ['empleados:leer', 'empleados:crear', 'tareo:leer'],
    type: [String],
    maxItems: 200,
  })
  @IsArray()
  @ArrayMaxSize(200, { message: 'Máximo 200 permisos por rol' })
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];

  @ApiPropertyOptional({
    description: 'Estado activo del rol',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
