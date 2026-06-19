import {
  IsString,
  IsInt,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  ValidateIf,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoDocumento,
  SexoTipo,
  EstadoEmpleado,
  TipoPago,
  TurnoTipo,
} from '@prisma/client';

// Sub-DTOs para datos JSON
export class EstudioDto {
  @IsString()
  institucion: string;

  @IsString()
  grado: string;

  @IsString()
  @IsOptional()
  especialidad?: string;

  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @IsString()
  @IsOptional()
  estado?: string;
}

export class CapacitacionDto {
  @IsString()
  institucion: string;

  @IsString()
  curso: string;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsInt()
  @IsOptional()
  horas?: number;

  @IsString()
  @IsOptional()
  estado?: string;
}

export class ExperienciaDto {
  @IsString()
  empresa: string;

  @IsString()
  cargo: string;

  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @IsDateString()
  @IsOptional()
  fecha_fin?: string;

  @IsString()
  @IsOptional()
  motivo_salida?: string;

  @IsString()
  @IsOptional()
  contacto?: string;
}

export class CreateEmpleadoDto {
  // Datos personales
  @IsEnum(TipoDocumento)
  tipo_documento: TipoDocumento;

  @IsString()
  @MinLength(8)
  @MaxLength(12)
  numero_documento: string;

  @IsString()
  @MinLength(2)
  apellido_paterno: string;

  @IsString()
  @MinLength(2)
  apellido_materno: string;

  @IsString()
  @MinLength(2)
  nombres: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsEnum(SexoTipo)
  sexo: SexoTipo;

  @IsString()
  @IsOptional()
  estado_civil?: string;

  @IsString()
  @IsOptional()
  nacionalidad?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  celular?: string;

  @ValidateIf((o, v) => v !== '' && v !== null)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  foto_url?: string;

  // Dirección
  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsString()
  @IsOptional()
  provincia?: string;

  @IsString()
  @IsOptional()
  distrito?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  distrito_id?: number;

  // Datos laborales
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  area_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cargo_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sede_id?: number;

  @IsDateString()
  fecha_ingreso: string;

  @IsDateString()
  @IsOptional()
  fecha_planilla?: string;

  @IsDateString()
  @IsOptional()
  fecha_cese?: string;

  @IsEnum(EstadoEmpleado)
  @IsOptional()
  estado?: EstadoEmpleado;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sueldo_base?: number;

  @IsEnum(TipoPago)
  @IsOptional()
  tipo_pago?: TipoPago;

  @IsEnum(TurnoTipo)
  @IsOptional()
  turno?: TurnoTipo;

  // Datos pensionarios
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  regimen_pensionario_id?: number;

  @IsString()
  @IsOptional()
  cuspp?: string;

  // Beneficios
  @IsBoolean()
  @IsOptional()
  asignacion_familiar?: boolean;

  @IsBoolean()
  @IsOptional()
  sctr?: boolean;

  @IsBoolean()
  @IsOptional()
  es_mype?: boolean;

  // Datos bancarios - Haberes
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  banco_haberes_id?: number;

  @IsString()
  @IsOptional()
  nro_cuenta_haberes?: string;

  @IsString()
  @IsOptional()
  cci_haberes?: string;

  // Datos bancarios - CTS
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  banco_cts_id?: number;

  @IsString()
  @IsOptional()
  nro_cuenta_cts?: string;

  @IsString()
  @IsOptional()
  cci_cts?: string;

  // Contacto asignado
  @IsString()
  @IsOptional()
  celular_asignado?: string;

  @ValidateIf((o, v) => v !== '' && v !== null)
  @IsEmail()
  @IsOptional()
  email_asignado?: string;

  // Datos físicos
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estatura?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  peso?: number;

  @IsString()
  @IsOptional()
  categoria_licencia?: string;

  // Datos secundarios (JSON)
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(20, { message: 'Máximo 20 estudios por empleado' })
  @ValidateNested({ each: true })
  @Type(() => EstudioDto)
  estudios?: EstudioDto[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Máximo 50 capacitaciones por empleado' })
  @ValidateNested({ each: true })
  @Type(() => CapacitacionDto)
  capacitaciones?: CapacitacionDto[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30, { message: 'Máximo 30 experiencias por empleado' })
  @ValidateNested({ each: true })
  @Type(() => ExperienciaDto)
  experiencias?: ExperienciaDto[];
}
