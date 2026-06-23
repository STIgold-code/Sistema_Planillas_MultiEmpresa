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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  anio?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  mes?: number;

  @IsOptional()
  @IsEnum(EstadoPlanillaFilter)
  estado?: EstadoPlanillaFilter;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  limit?: number = 20;
}
