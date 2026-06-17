import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsEnum,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { TipoVigenciaDocumento } from '@prisma/client';

export class CreateTipoDocumentoEmpleadoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  es_obligatorio?: boolean;

  @IsOptional()
  @IsBoolean()
  aplica_seleccion?: boolean;

  @IsOptional()
  @IsBoolean()
  aplica_rrhh?: boolean;

  @IsOptional()
  @IsEnum(TipoVigenciaDocumento)
  tipo_vigencia?: TipoVigenciaDocumento;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias_alerta?: number;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsInt()
  empresa_id: number;
}

export class UpdateTipoDocumentoEmpleadoDto extends PartialType(
  CreateTipoDocumentoEmpleadoDto,
) {}
