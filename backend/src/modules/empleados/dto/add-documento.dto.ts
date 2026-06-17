import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para metadatos del documento de empleado.
 * El archivo se recibe por multipart (FileInterceptor), no por JSON.
 * Los valores llegan como strings porque vienen de FormData.
 */
export class AddDocumentoDto {
  @IsOptional()
  @IsString()
  tipo_documento_empleado_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  fecha_emision?: string;

  @IsOptional()
  @IsString()
  fecha_vencimiento?: string;
}
