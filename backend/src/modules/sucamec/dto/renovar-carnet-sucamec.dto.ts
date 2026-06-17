import {
  IsString,
  IsInt,
  IsDateString,
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { CategoriaSucamec } from '@prisma/client';

export class RenovarCarnetSucamecDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9-]+$/i, {
    message:
      'El número de carnet solo puede contener letras, números y guiones',
  })
  numero_carnet: string; // Puede cambiar en renovación

  @IsEnum(CategoriaSucamec)
  categoria: CategoriaSucamec;

  @IsDateString()
  fecha_emision: string;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional()
  @IsInt()
  documento_id?: number; // Vincular a documento existente

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
