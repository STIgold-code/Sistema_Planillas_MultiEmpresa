import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoJustificacion, TipoDocumentoJustificacion } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

// Validador personalizado: dia_fin >= dia_inicio
@ValidatorConstraint({ name: 'diaFinMayorIgualInicio', async: false })
class DiaFinMayorIgualInicioConstraint implements ValidatorConstraintInterface {
  validate(diaFin: number, args: ValidationArguments) {
    const obj = args.object as { dia_inicio: number };
    return diaFin >= obj.dia_inicio;
  }

  defaultMessage() {
    return 'El día de fin debe ser mayor o igual al día de inicio';
  }
}

// DTO para archivos adjuntos
class ArchivoJustificacionDto {
  @IsString()
  archivo_url: string;

  @IsString()
  archivo_nombre: string;

  @IsString()
  archivo_tipo: string;

  @IsInt()
  @Min(0)
  archivo_size: number;
}

// DTO para crear justificación
export class CreateJustificacionDto {
  @IsInt()
  tareo_id: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dia_inicio: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @Validate(DiaFinMayorIgualInicioConstraint)
  dia_fin: number;

  @IsEnum(TipoJustificacion)
  tipo: TipoJustificacion;

  @IsOptional()
  @IsEnum(TipoDocumentoJustificacion)
  tipo_documento?: TipoDocumentoJustificacion;

  @IsOptional()
  @IsString()
  codigo_certificado?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Máximo 10 archivos por justificación' })
  @ValidateNested({ each: true })
  @Type(() => ArchivoJustificacionDto)
  archivos?: ArchivoJustificacionDto[];
}

// DTO para actualizar justificación
export class UpdateJustificacionDto extends PartialType(
  CreateJustificacionDto,
) {}

// DTO para agregar archivo a justificación existente
export class AddArchivoDto {
  @IsString()
  archivo_url: string;

  @IsString()
  archivo_nombre: string;

  @IsString()
  archivo_tipo: string;

  @IsInt()
  @Min(0)
  archivo_size: number;
}

// DTO para filtrar justificaciones
export class FilterJustificacionDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  empleado_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tareo_id?: number;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Type(() => Number)
  anio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sede_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  area_id?: number;

  @IsOptional()
  @IsEnum(TipoJustificacion)
  tipo?: TipoJustificacion;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
