import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostulanteDocumentoDto {
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_documento_empleado_id?: number;

  @IsOptional()
  @IsDateString()
  fecha_emision?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;
}
