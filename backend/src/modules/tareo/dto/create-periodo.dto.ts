import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePeriodoDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  anio: number;

  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
