import {
  IsString,
  IsInt,
  IsBoolean,
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

export class PlantillaItemDto {
  @IsInt()
  tipo_uniforme_id: number;

  @IsInt()
  @Min(1)
  @Max(10000)
  cantidad: number;
}

export class PlantillaUniformeDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsBoolean()
  predeterminada?: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'La plantilla debe tener al menos un artículo' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PlantillaItemDto)
  items: PlantillaItemDto[];
}
