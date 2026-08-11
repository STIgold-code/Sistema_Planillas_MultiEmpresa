import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverSolicitudCorreccionFechaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones_admin?: string;
}
