import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

export class LineaIngresoDto {
  @IsInt()
  tipo_uniforme_id: number;

  @IsString()
  @MaxLength(20)
  talla: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  precio_unitario: number;
}

export class CreateIngresoDto {
  @IsInt()
  proveedor_id: number;

  /** Si la compra se genera desde un requerimiento, lo vincula y lo cierra. */
  @IsOptional()
  @IsInt()
  requerimiento_id?: number;

  @IsString()
  @IsRealisticDate()
  fecha_ingreso: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos una línea' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LineaIngresoDto)
  lineas: LineaIngresoDto[];
}
