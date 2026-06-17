import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlantillaContratoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsString()
  @MaxLength(100)
  tipo_contrato: string;

  @IsString()
  @MinLength(10)
  contenido: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_base_url?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  es_predeterminada?: boolean;
}
