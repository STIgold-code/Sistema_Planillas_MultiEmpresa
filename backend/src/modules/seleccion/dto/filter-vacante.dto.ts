import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoVacante } from '@prisma/client';

export class FilterVacanteDto {
  @IsString()
  @IsOptional()
  buscar?: string;

  @IsEnum(EstadoVacante)
  @IsOptional()
  estado?: EstadoVacante;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  area_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cargo_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sede_id?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
