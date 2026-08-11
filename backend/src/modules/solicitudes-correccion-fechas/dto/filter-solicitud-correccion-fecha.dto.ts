import { IsOptional, IsInt, IsString, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoSolicitudCorreccionFecha } from '@prisma/client';

const aEntero = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? parseInt(value, 10) : value;

export class FilterSolicitudCorreccionFechaDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsEnum(EstadoSolicitudCorreccionFecha)
  estado?: EstadoSolicitudCorreccionFecha;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  empleado_id?: number;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  contrato_id?: number;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
