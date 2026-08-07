import { IsEnum, IsOptional } from 'class-validator';

/**
 * Criterios de ordenamiento del PDF masivo de boletas.
 * - `apellido`: orden alfabético por apellido paterno y materno (por defecto).
 * - `codigo`: orden por código de empleado ascendente (el que se imprime en la
 *   boleta), útil para cotejar contra el legajo físico.
 */
export enum OrdenBoletasMasivo {
  APELLIDO = 'apellido',
  CODIGO = 'codigo',
}

export class DescargarBoletasMasivoDto {
  @IsOptional()
  @IsEnum(OrdenBoletasMasivo)
  orden?: OrdenBoletasMasivo = OrdenBoletasMasivo.APELLIDO;
}
