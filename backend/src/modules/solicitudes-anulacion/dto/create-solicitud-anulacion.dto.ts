import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSolicitudAnulacionDto {
  @IsInt()
  contrato_id: number;

  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(2000)
  motivo: string;
}
