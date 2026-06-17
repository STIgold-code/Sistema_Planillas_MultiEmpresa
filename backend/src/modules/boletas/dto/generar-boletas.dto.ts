import {
  IsInt,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerarBoletasDto {
  @Type(() => Number)
  @IsInt()
  planilla_id: number;
}

export class GenerarBoletasSelectivasDto {
  @Type(() => Number)
  @IsInt()
  planilla_id: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un empleado' })
  @ArrayMaxSize(500, { message: 'Máximo 500 empleados por solicitud' })
  @IsInt({ each: true })
  empleado_ids: number[];
}

export class EnviarBoletasEmailDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planilla_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500, { message: 'Máximo 500 boletas por solicitud' })
  @IsInt({ each: true })
  boleta_ids?: number[];
}
