import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CategoriaDocumento {
  INGRESO = 'INGRESO',
  LABORAL = 'LABORAL',
  SALIDA = 'SALIDA',
}

export enum TipoArchivoPlantilla {
  HTML = 'HTML',
  WORD = 'WORD',
  EXCEL = 'EXCEL',
}

export class CreatePlantillaDocumentoDto {
  @IsString()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsEnum(CategoriaDocumento)
  categoria: CategoriaDocumento;

  @IsOptional()
  @IsString()
  @MaxLength(500000) // ~500KB límite para prevenir DoS
  contenido?: string;

  @IsOptional()
  @IsEnum(TipoArchivoPlantilla)
  tipo_archivo?: TipoArchivoPlantilla;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  requiere_firma?: boolean;

  @IsOptional()
  @IsBoolean()
  es_obligatorio?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
