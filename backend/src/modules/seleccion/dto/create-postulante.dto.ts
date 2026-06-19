import {
  IsString,
  IsInt,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDocumento, SexoTipo } from '@prisma/client';

// Sub-DTOs para datos JSON
export class EstudioPostulanteDto {
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

export class ExperienciaPostulanteDto {
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

export class CapacitacionPostulanteDto {
  @IsString()
  institucion: string;

  @IsString()
  curso: string;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  horas?: number;

  @IsString()
  @IsOptional()
  estado?: string;
}

export class CreatePostulanteDto {
  @IsInt()
  @Type(() => Number)
  vacante_id: number;

  @IsEnum(TipoDocumento)
  @IsOptional()
  tipo_documento?: TipoDocumento = TipoDocumento.DNI;

  @IsString()
  @Matches(/^[a-zA-Z0-9]{6,12}$/, {
    message: 'El documento debe tener entre 6 y 12 caracteres alfanumericos',
  })
  numero_documento: string;

  @IsString()
  @MinLength(2, {
    message: 'El apellido paterno debe tener al menos 2 caracteres',
  })
  apellido_paterno: string;

  @IsString()
  @MinLength(2, {
    message: 'El apellido materno debe tener al menos 2 caracteres',
  })
  apellido_materno: string;

  @IsString()
  @MinLength(2, { message: 'Los nombres deben tener al menos 2 caracteres' })
  nombres: string;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsEnum(SexoTipo)
  @IsOptional()
  sexo?: SexoTipo;

  @IsString()
  @IsOptional()
  @Matches(/^9\d{8}$/, {
    message: 'El celular debe tener 9 digitos y empezar con 9',
  })
  celular?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail({}, { message: 'Email invalido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  foto_url?: string;

  @IsString()
  @IsOptional()
  estado_civil?: string;

  @IsString()
  @IsOptional()
  nacionalidad?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  distrito_id?: number;

  // Datos físicos (si aplica al giro de negocio)
  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'La estatura no puede ser negativa' })
  @Max(9.99, { message: 'La estatura debe estar en metros (ej: 1.75)' })
  @Type(() => Number)
  estatura?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'El peso no puede ser negativo' })
  @Max(999.99, { message: 'El peso no puede exceder 999.99 kg' })
  @Type(() => Number)
  peso?: number;

  @IsString()
  @IsOptional()
  categoria_licencia?: string;

  // Datos del CV
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(20, { message: 'Máximo 20 estudios por postulante' })
  @ValidateNested({ each: true })
  @Type(() => EstudioPostulanteDto)
  estudios?: EstudioPostulanteDto[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30, { message: 'Máximo 30 experiencias por postulante' })
  @ValidateNested({ each: true })
  @Type(() => ExperienciaPostulanteDto)
  experiencias?: ExperienciaPostulanteDto[];

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(50, { message: 'Máximo 50 capacitaciones por postulante' })
  @ValidateNested({ each: true })
  @Type(() => CapacitacionPostulanteDto)
  capacitaciones?: CapacitacionPostulanteDto[];

  @IsNumber()
  @IsOptional()
  @Min(1130, {
    message:
      'La pretension salarial no puede ser menor al sueldo minimo (S/. 1,130)',
  })
  @Max(100000, {
    message: 'La pretension salarial no puede exceder S/. 100,000',
  })
  @Type(() => Number)
  pretension_salarial?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  procedencia_id?: number;
}
