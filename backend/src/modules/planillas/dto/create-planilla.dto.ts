import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePlanillaDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio: number;

  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @IsOptional()
  @IsInt()
  periodo_tareo_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
