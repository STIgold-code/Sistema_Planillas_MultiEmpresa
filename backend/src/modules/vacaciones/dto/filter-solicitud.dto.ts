import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSolicitudVacaciones } from '@prisma/client';

export class FilterSolicitudDto {
  @IsString()
  @IsOptional()
  buscar?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  empleado_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  area_id?: number;

  @IsEnum(EstadoSolicitudVacaciones)
  @IsOptional()
  estado?: EstadoSolicitudVacaciones;

  @IsString()
  @IsOptional()
  fecha_desde?: string;

  @IsString()
  @IsOptional()
  fecha_hasta?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
