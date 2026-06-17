import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SesionTareoService } from './sesion-tareo.service';
import { IniciarSesionTareoDto, UpdateConfiguracionTareoDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { PERMISOS } from '../../common/constants/permissions';

@Controller('tareo/sesiones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SesionTareoController {
  constructor(private readonly sesionTareoService: SesionTareoService) {}

  /**
   * Obtiene la configuración de tareo de la empresa
   */
  @Get('configuracion')
  @RequirePermissions(PERMISOS.TAREO.LEER)
  async getConfiguracion(@CurrentUser() user: AuthenticatedUser) {
    return this.sesionTareoService.getConfiguracion(user.empresa_id);
  }

  /**
   * Actualiza la configuración de tareo de la empresa
   */
  @Patch('configuracion')
  @RequirePermissions(PERMISOS.TAREO.CONFIGURAR)
  async updateConfiguracion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConfiguracionTareoDto,
  ) {
    return this.sesionTareoService.upsertConfiguracion(user.empresa_id, dto);
  }

  /**
   * Verifica si el usuario puede iniciar una nueva sesión
   */
  @Get('periodo/:periodoId/puede-iniciar')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async verificarPuedeIniciar(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sesionTareoService.verificarPuedeIniciarSesion(
      periodoId,
      user.id,
      user.empresa_id,
    );
  }

  /**
   * Inicia una sesión de tareo para el usuario actual
   */
  @Post('iniciar')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async iniciarSesion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IniciarSesionTareoDto,
  ) {
    return this.sesionTareoService.iniciarSesion(
      dto.periodo_id,
      user.id,
      user.empresa_id,
    );
  }

  /**
   * Finaliza una sesión de tareo
   */
  @Post(':id/finalizar')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async finalizarSesion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sesionTareoService.finalizarSesion(
      id,
      user.id,
      user.empresa_id,
    );
  }

  /**
   * ERR-005: Actualiza el heartbeat de una sesión activa.
   * El frontend debe llamar cada 30 segundos para mantener la sesión viva.
   */
  @Post(':id/heartbeat')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async heartbeat(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sesionTareoService.heartbeat(id, user.id, user.empresa_id);
  }

  /**
   * Marca una sesión como expirada.
   * Llamado por el frontend cuando el timer llega a cero.
   */
  @Post(':id/expirar')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async expirarSesion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sesionTareoService.expirarSesion(id, user.id, user.empresa_id);
  }

  /**
   * Obtiene el estado de sesión del usuario para un período
   */
  @Get('periodo/:periodoId/estado')
  @RequirePermissions(PERMISOS.TAREO.LEER)
  async obtenerEstadoSesion(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verificar si el usuario es admin (tiene permiso total)
    const esAdmin = user.rol?.permisos?.includes('*');

    // Verificar si el usuario tiene permiso de corrector
    const tienePermisoCorregir =
      user.rol?.permisos?.includes(PERMISOS.TAREO.CORREGIR) ||
      user.rol?.permisos?.includes('tareo:*');

    // Admin o corrector no tienen restricción
    const sinRestriccion = esAdmin || tienePermisoCorregir;

    const sesion = await this.sesionTareoService.obtenerEstadoSesion(
      periodoId,
      user.id,
      user.empresa_id,
      sinRestriccion,
    );

    return {
      sesion,
      es_admin: esAdmin,
      es_corrector: tienePermisoCorregir,
      requiere_sesion: !sinRestriccion,
    };
  }
}
