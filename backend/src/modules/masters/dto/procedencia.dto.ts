import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateProcedenciaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateProcedenciaDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
