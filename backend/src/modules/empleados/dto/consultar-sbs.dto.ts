import {
  IsString,
  IsEnum,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ConsultarSbsDto {
  @IsEnum(['DNI', 'CE'], { message: 'Tipo de documento debe ser DNI o CE' })
  tipo_documento: 'DNI' | 'CE';

  @IsString()
  @MinLength(8, {
    message: 'Número de documento debe tener al menos 8 caracteres',
  })
  @MaxLength(12, {
    message: 'Número de documento no puede exceder 12 caracteres',
  })
  @Matches(/^\d+$/, {
    message: 'Número de documento debe contener solo dígitos',
  })
  numero_documento: string;

  @IsString()
  @MinLength(2, { message: 'Apellido paterno requerido' })
  apellido_paterno: string;

  @IsString()
  @MinLength(2, { message: 'Apellido materno requerido' })
  apellido_materno: string;

  @IsString()
  @MinLength(2, { message: 'Nombres requerido' })
  nombres: string;
}
