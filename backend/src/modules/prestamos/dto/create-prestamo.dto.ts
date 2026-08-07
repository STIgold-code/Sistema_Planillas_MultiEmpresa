import { TipoPrestamo } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  MaxLength,
  Min,
  IsString,
} from 'class-validator';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

export class CreatePrestamoDto {
  @IsInt()
  empleado_id: number;

  @IsEnum(TipoPrestamo)
  tipo: TipoPrestamo;

  /**
   * Monto total de la deuda. Omitirlo deja el préstamo como descuento
   * recurrente sin monto definido (se descuenta hasta cancelarlo a mano).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto_total?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cuota_mensual: number;

  @IsDateString()
  @IsRealisticDate()
  fecha_otorgado: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class UpdatePrestamoDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cuota_mensual?: number;

  /** Ajuste manual del saldo pendiente (registra un movimiento AJUSTE). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  saldo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
