import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterSolicitudAnulacionDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsEnum(['PENDIENTE', 'APROBADA', 'RECHAZADA'])
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  empleado_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
