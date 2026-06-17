import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoCarnetSucamec, CategoriaSucamec } from '@prisma/client';

export class FilterCarnetSucamecDto {
  @IsOptional()
  @IsString()
  buscar?: string; // Búsqueda por nombre, DNI o número carnet

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  empleado_id?: number;

  @IsOptional()
  @IsEnum(EstadoCarnetSucamec)
  estado?: EstadoCarnetSucamec;

  @IsOptional()
  @IsEnum(CategoriaSucamec)
  categoria?: CategoriaSucamec;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  por_vencer?: boolean; // Carnets que vencen en 30 días

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orden?: 'asc' | 'desc' = 'desc';
}
