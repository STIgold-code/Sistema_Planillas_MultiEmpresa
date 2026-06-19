import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoPeriodoTareo } from '@prisma/client';

export class UpdatePeriodoDto {
  @IsOptional()
  @IsEnum(EstadoPeriodoTareo)
  estado?: EstadoPeriodoTareo;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
