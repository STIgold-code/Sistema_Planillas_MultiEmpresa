import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AccionAprobacion {
  APROBAR = 'APROBAR',
  MODIFICAR = 'MODIFICAR',
  RECHAZAR = 'RECHAZAR',
}

export class AprobarJefeDto {
  @IsEnum(AccionAprobacion)
  accion: AccionAprobacion;

  // Si accion = MODIFICAR, se requieren las nuevas fechas
  @ValidateIf((o) => o.accion === AccionAprobacion.MODIFICAR)
  @IsDateString()
  @IsNotEmpty({ message: 'La fecha de inicio es requerida al modificar' })
  fecha_inicio_aprobada?: string;

  @ValidateIf((o) => o.accion === AccionAprobacion.MODIFICAR)
  @IsDateString()
  @IsNotEmpty({ message: 'La fecha de fin es requerida al modificar' })
  fecha_fin_aprobada?: string;

  @ValidateIf((o) => o.accion === AccionAprobacion.MODIFICAR)
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'Los días aprobados son requeridos al modificar' })
  @Type(() => Number)
  dias_aprobados?: number;

  @IsString()
  @IsOptional()
  motivo_modificacion?: string;

  @IsString()
  @IsOptional()
  observacion?: string;

  // Si accion = RECHAZAR, se requiere motivo
  @ValidateIf((o) => o.accion === AccionAprobacion.RECHAZAR)
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es requerido' })
  motivo_rechazo?: string;
}

export class AprobarRrhhDto {
  @IsEnum(AccionAprobacion)
  accion: AccionAprobacion;

  @IsString()
  @IsOptional()
  observacion?: string;

  // Si accion = RECHAZAR
  @IsString()
  @IsOptional()
  motivo_rechazo?: string;
}

export class CancelarSolicitudDto {
  @IsString()
  motivo_cancelacion: string;
}
