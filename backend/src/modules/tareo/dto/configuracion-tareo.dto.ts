import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateConfiguracionTareoDto {
  @IsInt()
  @Min(10, { message: 'El tiempo mínimo de sesión es 10 minutos' })
  @Max(480, { message: 'El tiempo máximo de sesión es 480 minutos (8 horas)' })
  @IsOptional()
  @Type(() => Number)
  tiempo_limite_minutos?: number;

  @IsBoolean()
  @IsOptional()
  requiere_corrector?: boolean;

  @IsInt()
  @Min(1, { message: 'Mínimo 1 sesión por día' })
  @Max(10, { message: 'Máximo 10 sesiones por día' })
  @IsOptional()
  @Type(() => Number)
  sesiones_por_dia?: number;

  @IsInt()
  @Min(1, { message: 'Mínimo 1 sesión por período' })
  @IsOptional()
  @Type(() => Number)
  sesiones_por_periodo?: number | null;

  @IsInt()
  @Min(0, { message: 'Mínimo 0 días post cierre' })
  @Max(30, { message: 'Máximo 30 días post cierre' })
  @IsOptional()
  @Type(() => Number)
  dias_post_cierre?: number;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'hora_limite_diaria debe tener formato HH:mm (ej: 18:00)',
  })
  @IsOptional()
  hora_limite_diaria?: string | null;

  @IsBoolean()
  @IsOptional()
  requiere_aprobacion_extension?: boolean;

  @IsInt()
  @Min(0, { message: 'Mínimo 0 extensiones' })
  @Max(10, { message: 'Máximo 10 extensiones por período' })
  @IsOptional()
  @Type(() => Number)
  max_extensiones_periodo?: number;

  @IsBoolean()
  @IsOptional()
  notificar_email?: boolean;

  @IsBoolean()
  @IsOptional()
  notificar_sistema?: boolean;
}

export class ConfiguracionTareoResponseDto {
  tiempo_limite_minutos: number;
  requiere_corrector: boolean;
  sesiones_por_dia: number;
  sesiones_por_periodo: number | null;
  dias_post_cierre: number;
  hora_limite_diaria: string | null;
  requiere_aprobacion_extension: boolean;
  max_extensiones_periodo: number;
  notificar_email: boolean;
  notificar_sistema: boolean;
}
