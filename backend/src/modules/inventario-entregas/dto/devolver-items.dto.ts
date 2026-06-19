import {
  IsArray,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';

/** Estado en que el empleado devuelve la prenda. */
export type CondicionRetorno = 'BUENA' | 'DANADA';

export class DevolverItemsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe indicar al menos un item a devolver' })
  @IsInt({ each: true })
  item_ids: number[];

  /**
   * BUENA → vuelve al stock como USADO (reutilizable).
   * DANADA → se da de baja. Default: BUENA.
   */
  @IsOptional()
  @IsIn(['BUENA', 'DANADA'])
  condicion?: CondicionRetorno;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
