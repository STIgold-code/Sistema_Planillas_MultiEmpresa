import { IsOptional, IsInt, IsEnum, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimientoInventario } from '@prisma/client';

export type DireccionMovimiento = 'ENTRADAS' | 'SALIDAS';

export class FilterMovimientosDto {
  @IsOptional()
  @IsEnum(TipoMovimientoInventario)
  tipo_movimiento?: TipoMovimientoInventario;

  /**
   * Agrupación in/out: ENTRADAS = ENTRADA + DEVOLUCION (suman al stock);
   * SALIDAS = ENTREGA + BAJA (restan). Si se pasa tipo_movimiento, este manda.
   */
  @IsOptional()
  @IsIn(['ENTRADAS', 'SALIDAS'])
  direccion?: DireccionMovimiento;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipo_uniforme_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleado_id?: number;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
