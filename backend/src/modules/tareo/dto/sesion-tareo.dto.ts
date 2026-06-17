import { IsInt, IsPositive } from 'class-validator';

export class IniciarSesionTareoDto {
  @IsInt()
  @IsPositive()
  periodo_id: number;
}

export class SesionTareoResponseDto {
  id: number;
  periodo_id: number;
  usuario_id: number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  tiempo_limite_minutos: number;
  estado: string;
  tiempo_restante_segundos: number;
  puede_editar: boolean;
}
