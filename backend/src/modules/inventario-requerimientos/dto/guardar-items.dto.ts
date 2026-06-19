import {
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineaItemDto {
  @IsInt()
  @Min(1)
  tipo_uniforme_id: number;

  @IsString()
  @MaxLength(20)
  talla: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  cantidad: number;
}

/** Líneas de ítems sueltos (sin empleado) de un requerimiento = lista de compra. */
export class GuardarItemsDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => LineaItemDto)
  lineas: LineaItemDto[];
}
