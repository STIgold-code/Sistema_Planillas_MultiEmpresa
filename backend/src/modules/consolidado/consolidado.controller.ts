import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ConsolidadoService } from './consolidado.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

/**
 * Vista consolidada del estudio: agrega TODAS las empresas en una sola
 * respuesta. Solo accesible para superadmin (`@RequirePermissions('*')`),
 * porque expone datos cross-tenant de forma deliberada. No usa la empresa
 * activa del request: el servicio recorre todas las empresas.
 */
@Controller('consolidado')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('*')
export class ConsolidadoController {
  constructor(private readonly consolidadoService: ConsolidadoService) {}

  @Get('resumen')
  async getResumen(@Query('dias') dias?: string) {
    const ventana = dias ? parseInt(dias, 10) : undefined;
    const diasValido =
      ventana !== undefined && Number.isFinite(ventana) && ventana > 0
        ? ventana
        : undefined;
    return this.consolidadoService.getResumen(diasValido);
  }
}
