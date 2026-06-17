import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsBoolean,
  ValidateNested,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RequisitoDto {
  @IsString()
  tipo: string;

  @IsString()
  descripcion: string;

  @IsBoolean()
  @IsOptional()
  obligatorio?: boolean;
}

export class CreateVacanteDto {
  @IsString()
  @MinLength(3, { message: 'El titulo debe tener al menos 3 caracteres' })
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cargo_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  area_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sede_id?: number;

  @IsInt()
  @IsOptional()
  @Min(1, { message: 'La cantidad de puestos debe ser al menos 1' })
  @Type(() => Number)
  cantidad_puestos?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El sueldo ofrecido no puede ser negativo' })
  @Type(() => Number)
  sueldo_ofrecido?: number;

  @IsString()
  @IsOptional()
  tipo_contrato?: string;

  @IsString()
  @IsOptional()
  modalidad?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitoDto)
  @IsOptional()
  requisitos?: RequisitoDto[];

  @IsDateString()
  @IsOptional()
  fecha_publicacion?: string;

  @IsDateString()
  @IsOptional()
  fecha_cierre?: string;
}
