import {
  IsInt,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LineaRequerimientoDto } from './guardar-empleado.dto';

export class EmpleadoLoteDto {
  @IsInt()
  empleado_id: number;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LineaRequerimientoDto)
  lineas: LineaRequerimientoDto[];
}

export class EmpleadosLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => EmpleadoLoteDto)
  empleados: EmpleadoLoteDto[];
}
