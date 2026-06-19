import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateTipoEvaluacionDto {
  @IsString()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  puntaje_maximo?: number;

  @IsOptional()
  @IsNumber()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  es_obligatorio?: boolean;
}

export class UpdateTipoEvaluacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  puntaje_maximo?: number;

  @IsOptional()
  @IsNumber()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  es_obligatorio?: boolean;
}
