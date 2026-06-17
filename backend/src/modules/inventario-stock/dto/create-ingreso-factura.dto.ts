import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsRealisticDate } from '../../../common/validators/is-realistic-date.validator';
import { LineaIngresoDto } from './create-ingreso.dto';

/**
 * DTO para la digitalización de la factura del proveedor (Flujo 2 — Compras).
 * El operario captura la cabecera de la factura, sus líneas (prenda/talla/
 * cantidad/precio) y adjunta el archivo (imagen/PDF) ya subido vía /uploads.
 *
 * El proveedor es solo informativo: NO entra al sistema como entidad nueva,
 * se referencia uno ya existente. La factura puede diferir del requerimiento
 * (la factura es la realidad): no se bloquea, solo se muestra el delta.
 */
export class CreateIngresoFacturaDto {
  @IsInt()
  proveedor_id: number;

  /**
   * Requerimiento APROBADO del que parte la compra (opcional). Un mismo
   * requerimiento puede recibir varias facturas/ingresos.
   */
  @IsOptional()
  @IsInt()
  requerimiento_id?: number;

  // ── Cabecera de la factura ──────────────────────────────────────────────
  @IsString()
  @MaxLength(50)
  numero_factura: string;

  @IsString()
  @IsRealisticDate()
  fecha_factura: string;

  /** Monto total declarado en la factura (informativo, puede diferir del calculado). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000)
  monto_total?: number;

  // ── Archivo digitalizado (ya subido vía POST /uploads) ──────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  archivo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  archivo_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  // ── Líneas de la factura (lo que realmente trae) ────────────────────────
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe agregar al menos una línea' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LineaIngresoDto)
  lineas: LineaIngresoDto[];
}
