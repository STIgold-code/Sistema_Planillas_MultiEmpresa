import {
  IsArray,
  ValidateNested,
  ValidateIf,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImportacionCambioDto {
  @IsInt()
  @Min(1)
  empleado_id: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dia: number;

  @ValidateIf((_o, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  codigo: string | null;
}

export class AplicarImportacionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un cambio' })
  @ArrayMaxSize(5000, { message: 'Máximo 5000 cambios por importación' })
  @ValidateNested({ each: true })
  @Type(() => ImportacionCambioDto)
  cambios: ImportacionCambioDto[];
}
