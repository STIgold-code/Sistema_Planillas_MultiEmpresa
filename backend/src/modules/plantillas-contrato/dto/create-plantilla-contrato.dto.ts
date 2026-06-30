import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RegimenLaboral } from '@prisma/client';

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

  @IsOptional()
  @IsEnum(RegimenLaboral)
  regimen_laboral?: RegimenLaboral;

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
