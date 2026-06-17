import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPostulante } from '@prisma/client';

export class CambiarEstadoPostulanteDto {
  @IsEnum(EstadoPostulante)
  nuevo_estado: EstadoPostulante;

  @IsString()
  @IsOptional()
  motivo?: string;
}

export class AgregarEvaluacionDto {
  @IsInt()
  @Type(() => Number)
  tipo_evaluacion_id: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El puntaje debe ser mayor o igual a 0' })
  @Max(100, { message: 'El puntaje debe ser menor o igual a 100' })
  @Type(() => Number)
  puntaje?: number;

  @IsString()
  @IsOptional()
  comentario?: string;

  @IsString()
  @IsOptional()
  archivo_url?: string;

  @IsString()
  @IsOptional()
  archivo_nombre?: string;
}

export class UpdateEvaluacionDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  tipo_evaluacion_id?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El puntaje debe ser mayor o igual a 0' })
  @Max(100, { message: 'El puntaje debe ser menor o igual a 100' })
  @Type(() => Number)
  puntaje?: number;

  @IsString()
  @IsOptional()
  comentario?: string;

  @IsString()
  @IsOptional()
  archivo_url?: string;

  @IsString()
  @IsOptional()
  archivo_nombre?: string;
}
