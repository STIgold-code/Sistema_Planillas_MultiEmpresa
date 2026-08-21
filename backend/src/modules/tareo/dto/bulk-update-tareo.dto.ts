import {
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class TareoCeldaDto {
  @IsInt()
  empleado_id: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dia: number;

  @IsOptional()
  @IsString()
  codigo?: string | null; // Código de tipo marcación (A, C, DL, etc.)

  /**
   * Tiempo NO laborado del día, en minutos: tardanzas (T) y permisos parciales
   * sin goce (P). Tope de 480 — más de una jornada ya es inasistencia y se
   * registra con su propio código.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  minutos_no_laborados?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class BulkUpdateTareoDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos una celda' })
  @ArrayMaxSize(1000, { message: 'Máximo 1000 celdas por solicitud' })
  @ValidateNested({ each: true })
  @Type(() => TareoCeldaDto)
  celdas: TareoCeldaDto[];
}
