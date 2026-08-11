import {
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { IsRealisticFutureDate } from '../../../common/validators/is-realistic-date.validator';

/**
 * Alta de una solicitud de corrección de fechas.
 *
 * OJO: el endpoint es multipart (el sustento viaja en el mismo request), así
 * que el ValidationPipe global NO corre sobre esta clase — el controller arma
 * el DTO a mano desde el `FormData`. Los decoradores quedan como contrato
 * declarativo y las mismas reglas se revalidan en el service, que es la única
 * puerta que realmente protege la base.
 */
export class CreateSolicitudCorreccionFechaDto {
  @IsInt()
  contrato_id: number;

  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(2000)
  motivo: string;

  @IsDateString()
  @IsRealisticFutureDate({
    message:
      'La fecha de inicio propuesta tiene un año inválido. Verifica el año ingresado.',
  })
  fecha_inicio: string;

  /** Opcional: los contratos INDEFINIDOS no tienen fecha de fin. */
  @IsOptional()
  @IsDateString()
  @IsRealisticFutureDate({
    message:
      'La fecha de fin propuesta tiene un año inválido. Verifica el año ingresado.',
  })
  fecha_fin?: string;
}
