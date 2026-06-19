import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Filtros que replica la consulta de candidatos para el modo server-side. */
export class FiltrosSolicitarTodosDto {
  /** Busca por nombre, documento o cargo (búsqueda por palabras). */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  buscar?: string;

  /** ID numérico de la sede. */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  sede_id?: number;

  /** Si es true, solo empleados que ingresaron en los últimos 30 días. */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  solo_nuevos?: boolean;
}

/**
 * Body para POST /inventario/descuentos/solicitar-todos.
 * El servidor resuelve por sí mismo todos los empleados que matcheen
 * los filtros y tengan items descontables, y crea las solicitudes.
 */
export class SolicitarTodosDescuentoDto {
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltrosSolicitarTodosDto)
  filtros?: FiltrosSolicitarTodosDto;
}
