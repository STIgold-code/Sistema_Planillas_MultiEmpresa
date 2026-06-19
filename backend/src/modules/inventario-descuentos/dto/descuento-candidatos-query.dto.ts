import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Filtros de la lista de empleados candidatos para el descuento masivo. */
export class DescuentoCandidatosQueryDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  /** Busca por nombre, documento o cargo (búsqueda por palabras). */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  buscar?: string;

  /** Si es true, solo los empleados que ingresaron en los últimos 30 días. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  solo_nuevos?: boolean;

  /** Filtra por sede: acepta el id numérico o el nombre de la sede. */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sede?: string;
}
