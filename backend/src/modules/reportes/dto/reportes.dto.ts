import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FormatoReporte as FormatoReporteEnum } from '@prisma/client';

export class GenerarReporteDto {
  @IsString()
  codigo_reporte: string;

  @IsEnum(FormatoReporteEnum)
  formato: FormatoReporteEnum;

  @IsOptional()
  @IsObject()
  filtros?: Record<string, string | number | null>;
}

export class FiltrosReporteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  area_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sede_id?: number;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dias_vencer?: number;
}

export class HistorialQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  codigo_reporte?: string;
}

export class ContadorRegistrosDto {
  @IsString()
  codigo_reporte: string;

  @IsOptional()
  @IsObject()
  filtros?: Record<string, string | number | null>;
}
