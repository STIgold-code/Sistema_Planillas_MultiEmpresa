import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum EstadoPlanillaFilter {
  BORRADOR = 'BORRADOR',
  CALCULADA = 'CALCULADA',
  REVISADA = 'REVISADA',
  APROBADA = 'APROBADA',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

export class FilterPlanillaDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  anio?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  mes?: number;

  @IsOptional()
  @IsEnum(EstadoPlanillaFilter)
  estado?: EstadoPlanillaFilter;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  limit?: number = 20;
}
