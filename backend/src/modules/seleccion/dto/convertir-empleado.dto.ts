import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsEmail,
  MaxLength,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TipoPago, TurnoTipo } from '@prisma/client';

export class ConvertirEmpleadoDto {
  @IsDateString()
  fecha_ingreso: string;

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

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El sueldo base no puede ser negativo' })
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
  @Transform(({ value }) => value === true || value === 'true')
  asignacion_familiar?: boolean;

  // Bonos y asignaciones
  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El bono de productividad no puede ser negativo' })
  @Type(() => Number)
  bono_productividad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El bono de desempeno no puede ser negativo' })
  @Type(() => Number)
  bono_desempeno?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El bono de movilidad no puede ser negativo' })
  @Type(() => Number)
  bono_movilidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El bono de refrigerio no puede ser negativo' })
  @Type(() => Number)
  bono_refrigerio?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'La asignacion de cliente no puede ser negativa' })
  @Type(() => Number)
  asignacion_cliente?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El bono de armado no puede ser negativo' })
  @Type(() => Number)
  bono_armado?: number;

  // Beneficios adicionales
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  sctr?: boolean;

  // Fecha planilla (puede diferir de fecha_ingreso)
  @IsDateString()
  @IsOptional()
  fecha_planilla?: string;

  // Datos bancarios - Haberes
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  banco_haberes_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  nro_cuenta_haberes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cci_haberes?: string;

  // Datos bancarios - CTS
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  banco_cts_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  nro_cuenta_cts?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cci_cts?: string;

  // Contacto corporativo
  @IsString()
  @IsOptional()
  @MaxLength(20)
  celular_asignado?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email_asignado?: string;

  // Datos del contrato
  @IsString()
  tipo_contrato: string;

  @IsString()
  modalidad_contrato: string;

  @IsDateString()
  fecha_inicio_contrato: string;

  @IsDateString()
  fecha_fin_contrato: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cliente_id?: number;

  @IsString()
  @IsOptional()
  lugar_trabajo?: string;

  // Onboarding
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  iniciar_onboarding?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  plantilla_onboarding_id?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  mentor_id?: number;
}
