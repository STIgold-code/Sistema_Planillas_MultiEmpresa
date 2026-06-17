import { IsString, MinLength, MaxLength } from 'class-validator';

export class BajaItemDto {
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;
}
