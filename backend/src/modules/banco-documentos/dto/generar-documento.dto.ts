import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaDocumento } from './create-plantilla-documento.dto';

export enum EstadoDocumentoGenerado {
  PENDIENTE = 'PENDIENTE',
  FIRMADO = 'FIRMADO',
  RECHAZADO = 'RECHAZADO',
}

export class GenerarDocumentoDto {
  @IsInt()
  @Type(() => Number)
  empleado_id: number;

  @IsInt()
  @Type(() => Number)
  plantilla_documento_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class ActualizarEstadoDocumentoDto {
  @IsEnum(EstadoDocumentoGenerado)
  estado: EstadoDocumentoGenerado;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class GenerarMasivoDto {
  @IsInt()
  @Type(() => Number)
  empleado_id: number;

  @IsOptional()
  @IsEnum(CategoriaDocumento)
  categoria?: CategoriaDocumento = CategoriaDocumento.INGRESO;
}
