import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Claves de parámetros propios que una empresa puede sobrescribir. Lista
 * cerrada: son tasas de póliza/contrato con semántica conocida por el motor.
 * Agregar una clave nueva = extender esta lista (validación) y nada más:
 * la resolución en cascada del adapter ya la entiende.
 */
export const CLAVES_PARAMETRO_EMPRESA = [
  'sctrSalud',
  'sctrPension',
  'vidaLeyTasa',
] as const;

export type ClaveParametroEmpresa = (typeof CLAVES_PARAMETRO_EMPRESA)[number];

export class CreateParametroEmpresaDto {
  @IsIn(CLAVES_PARAMETRO_EMPRESA, {
    message: 'La clave del parámetro no es válida',
  })
  clave: ClaveParametroEmpresa;

  // Tasa como fracción (ej. 0.015 = 1.5%). Positiva y acotada a 1 (100%).
  @IsNumber()
  @IsPositive({ message: 'El valor debe ser mayor que 0' })
  valor: number;

  @IsDateString({}, { message: 'La vigencia desde debe ser una fecha válida' })
  vigencia_desde: string;

  @IsOptional()
  @IsDateString({}, { message: 'La vigencia hasta debe ser una fecha válida' })
  vigencia_hasta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
