import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverSolicitudAnulacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones_admin?: string;
}
