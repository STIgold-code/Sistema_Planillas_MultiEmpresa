import {
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSolicitudExtensionDto {
  @IsInt()
  @Type(() => Number)
  periodo_id: number;

  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'El motivo no puede exceder 1000 caracteres' })
  motivo: string;

  @IsInt()
  @Min(15, { message: 'El tiempo mínimo solicitado es 15 minutos' })
  @Max(120, { message: 'El tiempo máximo solicitado es 120 minutos' })
  @IsOptional()
  @Type(() => Number)
  tiempo_solicitado_min?: number = 30;
}

export enum AccionExtension {
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
}

export class ResponderExtensionDto {
  @IsEnum(AccionExtension, {
    message: 'La acción debe ser APROBAR o RECHAZAR',
  })
  accion: AccionExtension;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'El comentario no puede exceder 500 caracteres' })
  comentario?: string;

  @IsInt()
  @Min(15, { message: 'El tiempo mínimo otorgado es 15 minutos' })
  @Max(120, { message: 'El tiempo máximo otorgado es 120 minutos' })
  @IsOptional()
  @Type(() => Number)
  tiempo_otorgado_min?: number;
}

export class FilterSolicitudesExtensionDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  periodo_id?: number;

  @IsString()
  @IsOptional()
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

// Response DTOs
export class SolicitudExtensionResponseDto {
  id: number;
  empresa_id: number;
  periodo_id: number;
  usuario_id: number;
  sesion_tareo_id: number;
  motivo: string;
  tiempo_solicitado_min: number;
  estado: string;
  aprobado_por_id: number | null;
  fecha_solicitud: Date;
  fecha_respuesta: Date | null;
  comentario_respuesta: string | null;
  usuario?: {
    id: number;
    nombre_completo: string;
    email: string;
  };
  periodo?: {
    anio: number;
    mes: number;
  };
  aprobado_por?: {
    id: number;
    nombre_completo: string;
  } | null;
}
