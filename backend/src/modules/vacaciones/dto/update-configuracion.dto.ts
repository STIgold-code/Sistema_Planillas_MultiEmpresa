import { IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateConfiguracionVacacionesDto {
  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  @Type(() => Number)
  dias_regimen_general?: number;

  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  @Type(() => Number)
  dias_regimen_mype?: number;

  @IsInt()
  @Min(1)
  @Max(15)
  @IsOptional()
  @Type(() => Number)
  dias_tiempo_parcial?: number;

  @IsBoolean()
  @IsOptional()
  permitir_venta?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  porcentaje_max_venta?: number;

  @IsBoolean()
  @IsOptional()
  permitir_fraccionamiento?: boolean;

  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  @Type(() => Number)
  dias_minimo_goce?: number;

  @IsBoolean()
  @IsOptional()
  permitir_acumulacion?: boolean;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Type(() => Number)
  max_periodos_acumulados?: number;

  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  @Type(() => Number)
  dias_alerta_vencimiento?: number;

  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  @Type(() => Number)
  dias_alerta_acumulacion?: number;
}
