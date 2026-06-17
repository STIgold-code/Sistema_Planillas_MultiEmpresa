import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateTareoDetalleDto {
  @IsOptional()
  @IsInt()
  tipo_marcacion_id?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  horas?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
