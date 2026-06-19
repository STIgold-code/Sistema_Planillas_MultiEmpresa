import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Nombre del rol',
    example: 'Supervisor Senior',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Supervisor de área con acceso extendido',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    description:
      'Lista de códigos de permisos. Solo puede asignar permisos que usted posea.',
    example: [
      'empleados:leer',
      'empleados:crear',
      'empleados:editar',
      'tareo:leer',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];

  @ApiPropertyOptional({
    description: 'Estado activo del rol',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
