import {
  IsString,
  MaxLength,
  MinLength,
  IsInt,
  IsOptional,
} from 'class-validator';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

export class CreateRequerimientoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsRealisticDate()
  fecha: string;

  @IsOptional()
  @IsInt()
  proveedor_id?: number;
}
