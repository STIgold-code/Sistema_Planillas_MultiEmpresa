import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';

const TIPOS_MOVIMIENTO = [
  'ALTA',
  'BAJA',
  'RENUNCIA',
  'VACACIONES',
  'SUSPENSION',
  'REINCORPORACION',
] as const;

export class RegistrarMovimientoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(TIPOS_MOVIMIENTO)
  tipo_movimiento: (typeof TIPOS_MOVIMIENTO)[number];

  @IsString()
  @IsNotEmpty()
  fecha_movimiento: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
