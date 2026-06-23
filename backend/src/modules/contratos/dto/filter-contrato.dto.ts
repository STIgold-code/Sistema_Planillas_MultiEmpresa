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
import { EstadoContrato } from './create-contrato.dto';

export class FilterContratoDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value, 10) : value,
  )
  @IsInt()
  empleado_id?: number;

  @IsOptional()
  @IsEnum(EstadoContrato)
  estado?: EstadoContrato;

  @IsOptional()
  @IsString()
  tipo_contrato?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

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

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  por_vencer?: boolean; // true para contratos que vencen en 30 días

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orden?: 'asc' | 'desc' = 'desc'; // Ordenar por fecha_inicio: desc = más recientes, asc = más antiguos
}
