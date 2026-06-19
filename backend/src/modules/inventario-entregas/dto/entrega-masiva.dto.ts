import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';
import { LineaEntregaDto } from './create-entrega.dto';

/** Un empleado dentro de la entrega masiva, con sus líneas (prenda + talla + cantidad). */
export class EmpleadoEntregaMasivaDto {
  @IsInt()
  empleado_id: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cada empleado debe tener al menos una línea' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LineaEntregaDto)
  lineas: LineaEntregaDto[];
}

/**
 * Body de la entrega masiva: una fecha común y varios empleados, cada uno con
 * sus líneas. El sistema reparte el stock DISPONIBLE; las líneas que no se
 * pueden cubrir se reportan como faltantes (no bloquean al resto).
 */
export class EntregaMasivaDto {
  @IsString()
  @IsRealisticDate()
  fecha_entrega: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un empleado' })
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => EmpleadoEntregaMasivaDto)
  empleados: EmpleadoEntregaMasivaDto[];
}
