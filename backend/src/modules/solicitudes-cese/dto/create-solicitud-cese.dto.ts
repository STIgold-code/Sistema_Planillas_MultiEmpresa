import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

export class CreateSolicitudCeseDto {
  @IsInt()
  empleado_id: number;

  @IsInt()
  tipo_cese_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivo?: string;

  @IsDateString()
  @IsRealisticDate()
  fecha_efectiva: string;
}
