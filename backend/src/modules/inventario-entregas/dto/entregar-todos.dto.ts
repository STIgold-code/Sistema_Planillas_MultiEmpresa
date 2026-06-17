import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';

/** Filtros para resolver los candidatos en el servidor. Mismo criterio que EntregaCandidatosQueryDto. */
export class EntregarTodosFiltrosDto {
  /** Busca por nombre, documento o cargo. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buscar?: string;

  /**
   * Id numérico o nombre de la sede. Se trata igual que el filtro `sede`
   * del endpoint candidatos: si parsea como entero filtra por id; si no, por nombre.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sede_id?: string;

  /** Si es true, solo empleados que ingresaron en los últimos 30 días. */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  solo_nuevos?: boolean;
}

/**
 * Body del endpoint POST /inventario/entregas/entregar-todos.
 * El servidor resuelve todos los candidatos que matcheen los filtros,
 * construye las líneas de dotación y ejecuta la entrega masiva.
 */
export class EntregarTodosDto {
  /** Fecha de entrega (YYYY-MM-DD). */
  @IsString()
  @IsRealisticDate()
  fecha: string;

  /**
   * Si es true, el sistema usa las tallas guardadas del empleado (EmpleadoTalla)
   * para la dotación. Si una prenda no tiene talla guardada, no se incluye.
   * En ambos casos se usa la cantidad_estandar del tipo.
   */
  @IsBoolean()
  dotacion_completa: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => EntregarTodosFiltrosDto)
  filtros: EntregarTodosFiltrosDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
