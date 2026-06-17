import { IsInt, IsString, MinLength, MaxLength, Min } from 'class-validator';

export class CreateBajaDto {
  @IsInt()
  @Min(1)
  item_id: number;

  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;
}
