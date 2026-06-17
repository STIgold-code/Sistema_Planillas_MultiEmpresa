import {
  IsInt,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDescuentoDto {
  @IsInt()
  @Min(1)
  empleado_id: number;

  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un item' })
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  item_ids: number[];
}
