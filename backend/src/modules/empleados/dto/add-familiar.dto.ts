import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TipoDocumento } from '@prisma/client';

export class AddFamiliarDto {
  @IsString()
  @MaxLength(50)
  parentesco: string;

  @IsString()
  @MaxLength(200)
  nombres_apellidos: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  numero_documento?: string;

  @IsOptional()
  @IsString()
  fecha_nacimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  es_dependiente?: boolean;
}
