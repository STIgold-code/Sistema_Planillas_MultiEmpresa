import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPostulante } from '@prisma/client';

export class FilterPostulanteDto {
  @IsString()
  @IsOptional()
  buscar?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  vacante_id?: number;

  @IsEnum(EstadoPostulante)
  @IsOptional()
  estado?: EstadoPostulante;

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
