import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GeneroUniforme } from '@prisma/client';

export class TallaInputDto {
  @IsString()
  @MaxLength(20)
  valor: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stock_minimo?: number;
}

export class CreateTipoUniformeDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @IsEnum(GeneroUniforme)
  genero?: GeneroUniforme;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_referencial?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad_estandar?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TallaInputDto)
  tallas?: TallaInputDto[];

  /**
   * IDs de Características a asociar a esta prenda (M:N).
   * Si no se envía, no se toca el set actual; si llega `[]`, se vacía.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(1, { each: true })
  caracteristica_ids?: number[];
}
