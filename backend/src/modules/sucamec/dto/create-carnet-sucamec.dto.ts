import {
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { EstadoCarnetSucamec, CategoriaSucamec } from '@prisma/client';

export class CreateCarnetSucamecDto {
  @IsInt()
  empleado_id: number;

  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9-]+$/i, {
    message:
      'El número de carnet solo puede contener letras, números y guiones',
  })
  numero_carnet: string;

  @IsEnum(CategoriaSucamec)
  categoria: CategoriaSucamec;

  @IsDateString()
  fecha_emision: string;

  @IsDateString()
  fecha_vencimiento: string;

  @IsOptional()
  @IsEnum(EstadoCarnetSucamec)
  estado?: EstadoCarnetSucamec;

  @IsOptional()
  @IsInt()
  documento_id?: number; // Vincular a documento existente

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
