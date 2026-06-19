import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPeriodoVacacional } from '@prisma/client';

export class FilterPeriodoVacacionalDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  empleado_id?: number;

  @IsEnum(EstadoPeriodoVacacional)
  @IsOptional()
  estado?: EstadoPeriodoVacacional;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
