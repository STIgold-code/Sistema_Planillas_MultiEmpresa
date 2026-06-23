import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { VacacionesService } from './vacaciones.service';
import {
  CreateSolicitudDto,
  FilterSolicitudDto,
  AprobarJefeDto,
  AprobarRrhhDto,
  CancelarSolicitudDto,
  FilterPeriodoVacacionalDto,
  UpdateConfiguracionVacacionesDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('vacaciones')
export class VacacionesController {
  constructor(private readonly vacacionesService: VacacionesService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @RequirePermissions('vacaciones:leer')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.vacacionesService.getDashboard(user.empresa_id);
  }

  @Get('alertas/vencimiento')
  @RequirePermissions('vacaciones:leer')
  getAlertasVencimiento(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dias') dias?: string,
  ) {
    return this.vacacionesService.getAlertasVencimiento(
      user.empresa_id,
      dias ? parseInt(dias) : 30,
    );
  }

  @Post('actualizar-estados')
  @RequirePermissions('vacaciones:editar')
  actualizarEstados(@CurrentUser() user: AuthenticatedUser) {
    return this.vacacionesService.actualizarEstadosPeriodos(user.empresa_id);
  }

  // ==================== CONFIGURACIÓN ====================

  @Get('configuracion')
  @RequirePermissions('vacaciones:leer')
  getConfiguracion(@CurrentUser() user: AuthenticatedUser) {
    return this.vacacionesService.getConfiguracion(user.empresa_id);
  }

  @Patch('configuracion')
  @RequirePermissions('vacaciones:configurar')
  updateConfiguracion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConfiguracionVacacionesDto,
  ) {
    return this.vacacionesService.updateConfiguracion(user.empresa_id, dto);
  }

  // ==================== PERÍODOS ====================

  @Get('periodos')
  @RequirePermissions('vacaciones:leer')
  findAllPeriodos(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPeriodoVacacionalDto,
  ) {
    return this.vacacionesService.findAllPeriodos(user.empresa_id, filters);
  }

  @Get('periodos/:id')
  @RequirePermissions('vacaciones:leer')
  findOnePeriodo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacacionesService.findOnePeriodo(id, user.empresa_id);
  }

  @Post('periodos/generar/:empleadoId')
  @RequirePermissions('vacaciones:crear')
  generarPeriodosEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacacionesService.generarPeriodosEmpleado(
      empleadoId,
      user.empresa_id,
    );
  }

  @Get('saldo/:empleadoId')
  @RequirePermissions('vacaciones:leer')
  getSaldoEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacacionesService.getSaldoEmpleado(empleadoId, user.empresa_id);
  }

  // ==================== SOLICITUDES ====================

  @Get('solicitudes')
  @RequirePermissions('vacaciones:leer')
  findAllSolicitudes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterSolicitudDto,
  ) {
    return this.vacacionesService.findAllSolicitudes(user.empresa_id, filters);
  }

  @Get('solicitudes/:id')
  @RequirePermissions('vacaciones:leer')
  findOneSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacacionesService.findOneSolicitud(id, user.empresa_id);
  }

  @Post('solicitudes')
  @RequirePermissions('vacaciones:crear')
  createSolicitud(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSolicitudDto,
  ) {
    return this.vacacionesService.createSolicitud(
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Patch('solicitudes/:id/aprobar-jefe')
  @RequirePermissions('vacaciones:aprobar_jefe')
  aprobarPorJefe(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AprobarJefeDto,
  ) {
    return this.vacacionesService.aprobarPorJefe(
      id,
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Patch('solicitudes/:id/aprobar-rrhh')
  @RequirePermissions('vacaciones:aprobar_final')
  aprobarPorRrhh(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AprobarRrhhDto,
  ) {
    return this.vacacionesService.aprobarPorRrhh(
      id,
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Patch('solicitudes/:id/cancelar')
  @RequirePermissions('vacaciones:editar')
  cancelarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelarSolicitudDto,
  ) {
    return this.vacacionesService.cancelarSolicitud(
      id,
      user.empresa_id,
      dto,
      user.id,
    );
  }
}
