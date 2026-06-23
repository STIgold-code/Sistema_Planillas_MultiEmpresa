import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('dashboard:leer')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStats(user.empresa_id);
  }

  @Get('contratos-por-vencer')
  @RequirePermissions('dashboard:leer')
  async getContratosPorVencer(
    @Query('dias') dias?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.dashboardService.getContratosPorVencer(
      user.empresa_id,
      dias ? parseInt(dias, 10) : 30,
    );
  }

  @Get('empleados-pendientes')
  @RequirePermissions('dashboard:leer')
  async getEmpleadosPendientes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getEmpleadosPendientes(user.empresa_id);
  }

  @Get('empleados-cesados')
  @RequirePermissions('dashboard:leer')
  async getEmpleadosCesados(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getEmpleadosCesados(user.empresa_id);
  }

  @Get('solicitudes-cese-pendientes')
  @RequirePermissions('dashboard:leer')
  async getSolicitudesCesePendientes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSolicitudesCesePendientes(user.empresa_id);
  }

  @Get('solicitudes-anulacion-pendientes')
  @RequirePermissions('dashboard:leer')
  async getSolicitudesAnulacionPendientes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSolicitudesAnulacionPendientes(
      user.empresa_id,
    );
  }
}
