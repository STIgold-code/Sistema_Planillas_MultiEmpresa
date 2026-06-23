import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TipoMovimiento {
  INGRESOS = 'INGRESOS',
  CESES = 'CESES',
  VENCIMIENTOS = 'VENCIMIENTOS',
  TODOS = 'TODOS',
}

export enum EstadoEmpleadoFiltro {
  ACTIVO = 'ACTIVO',
  CESADO = 'CESADO',
  BAJA = 'BAJA',
  PENDIENTE = 'PENDIENTE',
  TODOS = 'TODOS',
}

export class FilterMovimientosDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(2020)
  anio?: number;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento = TipoMovimiento.TODOS;

  @IsOptional()
  @IsEnum(EstadoEmpleadoFiltro)
  estado?: EstadoEmpleadoFiltro;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  cliente_id?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  sede_id?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  area_id?: number;

  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
