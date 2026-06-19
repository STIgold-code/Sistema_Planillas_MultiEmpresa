import { IsInt, Min } from 'class-validator';

/** Body de PATCH /inventario/requerimientos/:id/proveedor. */
export class AsignarProveedorDto {
  @IsInt()
  @Min(1)
  proveedor_id: number;
}
