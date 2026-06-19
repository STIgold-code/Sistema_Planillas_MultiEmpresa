import {
  IsInt,
  IsString,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineaRequerimientoDto {
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

export class GuardarEmpleadoDto {
  @IsInt()
  empleado_id: number;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LineaRequerimientoDto)
  lineas: LineaRequerimientoDto[];
}
