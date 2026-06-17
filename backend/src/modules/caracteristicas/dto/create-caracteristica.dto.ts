import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body para crear una característica (atributo descriptivo libre que el PO
 * carga y luego se asocia a uno o varios tipos de uniforme).
 */
export class CreateCaracteristicaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
