import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EstadoEmpleado, TurnoTipo } from '@prisma/client';
import { EstadoDocumentosFilter } from '../../../common/constants/business-rules';

export class FilterEmpleadoDto {
  @IsString()
  @IsOptional()
  buscar?: string; // Busca en nombre, documento

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  area_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cargo_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sede_id?: number;

  @IsEnum(EstadoEmpleado)
  @IsOptional()
  estado?: EstadoEmpleado;

  /**
   * Filtra empleados REINGRESANTES: estado = ACTIVO + al menos 1 vinculo_laboral
   * cerrado. Se usa combinado con estado=ACTIVO o solo (aplica ACTIVO implicito).
   * - true: solo reingresantes
   * - false: activos puros (sin vinculos cerrados)
   * - undefined: no filtra por reingreso
   */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  esReingresante?: boolean;

  @IsEnum(TurnoTipo)
  @IsOptional()
  turno?: TurnoTipo;

  @IsEnum(EstadoDocumentosFilter)
  @IsOptional()
  estado_docs?: EstadoDocumentosFilter;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'periodo debe tener formato YYYY-MM',
  })
  periodo?: string; // Formato YYYY-MM, solo aplica con filtro de estado

  @IsDateString()
  @IsOptional()
  fecha_ingreso_desde?: string;

  @IsDateString()
  @IsOptional()
  fecha_ingreso_hasta?: string;

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
}
