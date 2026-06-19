import { IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAlertasFaltasDto {
  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sede_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  area_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimo_faltas?: number; // Default: 3
}
