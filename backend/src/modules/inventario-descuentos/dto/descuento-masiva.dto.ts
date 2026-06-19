import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  IsString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Solicita descuentos a VARIOS empleados de una vez. Por cada empleado se
 * descuentan sus items ENTREGADOS no devueltos que no estén ya en una solicitud
 * pendiente. El mismo motivo aplica a todas las solicitudes creadas.
 */
export class DescuentoMasivaDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un empleado' })
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  empleado_ids: number[];

  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;
}
