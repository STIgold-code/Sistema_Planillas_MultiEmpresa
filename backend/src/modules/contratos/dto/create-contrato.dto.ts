import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';

export enum EstadoContrato {
  VIGENTE = 'ACTIVO',
  VENCIDO = 'PENDIENTE',
  RENOVADO = 'RENOVADO',
  TERMINADO = 'CESADO',
}

export class CreateContratoDto {
  @IsInt()
  empleado_id: number;

  @IsString()
  @MaxLength(100)
  tipo_contrato: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modalidad?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsEnum(EstadoContrato)
  estado?: EstadoContrato;

  @IsOptional()
  @IsBoolean()
  renovar?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'La remuneración no puede ser negativa' })
  remuneracion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  empresa_cliente?: string;

  @IsOptional()
  @IsInt()
  cliente_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lugar_trabajo?: string;

  @IsOptional()
  @IsInt()
  plantilla_id?: number;

  @IsOptional()
  @IsInt()
  cargo_id?: number;
}
