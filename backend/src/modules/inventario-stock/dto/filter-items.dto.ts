import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoItemInventario } from '@prisma/client';

export class FilterItemsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;

  @IsOptional()
  @IsEnum(EstadoItemInventario)
  estado?: EstadoItemInventario;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipo_uniforme_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proveedor_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  talla?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
