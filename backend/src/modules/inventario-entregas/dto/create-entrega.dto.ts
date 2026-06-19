import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

export class LineaEntregaDto {
  @IsInt()
  tipo_uniforme_id: number;

  @IsString()
  @MaxLength(20)
  talla: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  cantidad: number;
}

export class CreateEntregaDto {
  @IsInt()
  empleado_id: number;

  @IsString()
  @IsRealisticDate()
  fecha_entrega: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos una línea' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LineaEntregaDto)
  lineas: LineaEntregaDto[];
}
