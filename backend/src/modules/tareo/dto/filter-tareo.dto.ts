import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoTareo } from '@prisma/client';

export class FilterTareoDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  area_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sede_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cargo_id?: number;

  @IsOptional()
  @IsEnum(EstadoTareo)
  estado?: EstadoTareo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;
}
