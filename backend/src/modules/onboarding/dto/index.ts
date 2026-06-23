import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Enums
export enum FaseOnboarding {
  PRE_INGRESO = 'PRE_INGRESO',
  DIA_1 = 'DIA_1',
  SEMANA_1 = 'SEMANA_1',
  MES_1 = 'MES_1',
  MES_3 = 'MES_3',
  CONTINUO = 'CONTINUO',
}

export enum ResponsableOnboarding {
  RRHH = 'RRHH',
  JEFE_DIRECTO = 'JEFE_DIRECTO',
  TI = 'TI',
  SEGURIDAD = 'SEGURIDAD',
  EMPLEADO = 'EMPLEADO',
  MENTOR = 'MENTOR',
  ADMINISTRACION = 'ADMINISTRACION',
}

export enum EstadoTareaOnboarding {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
  OMITIDA = 'OMITIDA',
  VENCIDA = 'VENCIDA',
}

// ==================== PLANTILLAS ====================

export class CreateTareaOnboardingDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  instrucciones?: string;

  @IsEnum(FaseOnboarding)
  fase: FaseOnboarding;

  @IsEnum(ResponsableOnboarding)
  responsable: ResponsableOnboarding;

  @IsInt()
  @Min(-30)
  @Max(365)
  dias_desde_ingreso: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  duracion_horas?: number;

  @IsOptional()
  @IsBoolean()
  es_obligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  requiere_evidencia?: boolean;

  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CreatePlantillaOnboardingDto {
  @IsString()
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  cargo_id?: number;

  @IsOptional()
  @IsInt()
  area_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  duracion_dias?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTareaOnboardingDto)
  tareas?: CreateTareaOnboardingDto[];
}

export class UpdatePlantillaOnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  cargo_id?: number;

  @IsOptional()
  @IsInt()
  area_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  duracion_dias?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateTareaOnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  instrucciones?: string;

  @IsOptional()
  @IsEnum(FaseOnboarding)
  fase?: FaseOnboarding;

  @IsOptional()
  @IsEnum(ResponsableOnboarding)
  responsable?: ResponsableOnboarding;

  @IsOptional()
  @IsInt()
  @Min(-30)
  @Max(365)
  dias_desde_ingreso?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  duracion_horas?: number;

  @IsOptional()
  @IsBoolean()
  es_obligatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  requiere_evidencia?: boolean;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

// ==================== PROCESOS ====================

export class IniciarOnboardingDto {
  @IsInt()
  plantilla_id: number;

  @IsOptional()
  @IsInt()
  responsable_rrhh_id?: number;

  @IsOptional()
  @IsInt()
  mentor_id?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CompletarTareaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsOptional()
  @IsString()
  evidencia_url?: string;

  @IsOptional()
  @IsString()
  evidencia_nombre?: string;
}

export class OmitirTareaDto {
  @IsString()
  @MaxLength(500)
  motivo: string;
}

export class FilterProcesoOnboardingDto {
  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  empleado_id?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  con_alertas?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  page?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  limit?: number;
}
