import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MontoItemDto {
  @IsInt()
  @Min(1)
  item_id: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_descuento: number;
}

export class AprobarDescuentoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MontoItemDto)
  montos: MontoItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones_admin?: string;
}

export class RechazarDescuentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones_admin?: string;
}
