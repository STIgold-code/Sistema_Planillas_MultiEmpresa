import { IsOptional, IsInt, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterSedeDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  cliente_id?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  limit?: number = 50;
}
