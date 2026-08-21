import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateTareoDetalleDto {
  @IsOptional()
  @IsInt()
  tipo_marcacion_id?: number | null;

  /** Horas EFECTIVAMENTE TRABAJADAS del día (alimenta las horas extras). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  horas?: number;

  /**
   * Tiempo NO laborado del día, en minutos enteros: tardanzas y permisos
   * parciales sin goce. Es lo opuesto a `horas` y por eso es un campo distinto.
   *
   * Tope de 480 (ocho horas): más que una jornada completa ya no es tardanza
   * sino inasistencia, y esa se registra con su propio código de marcación.
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
