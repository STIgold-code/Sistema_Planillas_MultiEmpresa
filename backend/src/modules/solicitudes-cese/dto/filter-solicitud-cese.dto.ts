import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export enum EstadoSolicitudCeseDto {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export class FilterSolicitudCeseDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsEnum(EstadoSolicitudCeseDto)
  estado?: EstadoSolicitudCeseDto;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  tipo_cese_id?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  empleado_id?: number;

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
