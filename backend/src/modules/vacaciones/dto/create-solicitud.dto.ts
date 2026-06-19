import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSolicitudDto {
  @IsInt()
  @Type(() => Number)
  empleado_id: number;

  @IsInt()
  @Type(() => Number)
  periodo_vacacional_id: number;

  @IsDateString()
  fecha_inicio_solicitada: string;

  @IsDateString()
  fecha_fin_solicitada: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  dias_solicitados: number;

  @IsBoolean()
  @IsOptional()
  incluye_venta?: boolean;

  @IsInt()
  @Min(0)
  @Max(15)
  @IsOptional()
  @Type(() => Number)
  dias_venta?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  observaciones?: string;
}
