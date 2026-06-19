import {
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class TareoCeldaDto {
  @IsInt()
  empleado_id: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dia: number;

  @IsOptional()
  @IsString()
  codigo?: string | null; // Código de tipo marcación (A, C, DL, etc.)

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class BulkUpdateTareoDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos una celda' })
  @ArrayMaxSize(1000, { message: 'Máximo 1000 celdas por solicitud' })
  @ValidateNested({ each: true })
  @Type(() => TareoCeldaDto)
  celdas: TareoCeldaDto[];
}
