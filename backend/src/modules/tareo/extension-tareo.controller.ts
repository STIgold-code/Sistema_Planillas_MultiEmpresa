import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ExtensionTareoService } from './extension-tareo.service';
import {
  CreateSolicitudExtensionDto,
  ResponderExtensionDto,
  FilterSolicitudesExtensionDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { PERMISOS } from '../../common/constants/permissions';

@Controller('tareo/extensiones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExtensionTareoController {
  constructor(private readonly extensionService: ExtensionTareoService) {}

  /**
   * Crear solicitud de extensión
   * POST /tareo/extensiones
   */
  @Post()
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async crearSolicitud(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSolicitudExtensionDto,
  ) {
    return this.extensionService.crearSolicitud(dto, user.id, user.empresa_id);
  }

  /**
   * Listar solicitudes (corrector/admin)
   * GET /tareo/extensiones
   */
  @Get()
  @RequirePermissions(PERMISOS.TAREO.CORREGIR)
  async listarSolicitudes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterSolicitudesExtensionDto,
  ) {
    return this.extensionService.listarSolicitudes(user.empresa_id, filters);
  }

  /**
   * Mis solicitudes (usuario actual)
   * GET /tareo/extensiones/mis-solicitudes
   */
  @Get('mis-solicitudes')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async misSolicitudes(@CurrentUser() user: AuthenticatedUser) {
    return this.extensionService.misSolicitudes(user.id, user.empresa_id);
  }

  /**
   * Conteo de pendientes (para badge)
   * GET /tareo/extensiones/pendientes/count
   */
  @Get('pendientes/count')
  @RequirePermissions(PERMISOS.TAREO.CORREGIR)
  async contarPendientes(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.extensionService.contarPendientes(user.empresa_id);
    return { count };
  }

  /**
   * Verificar si tiene solicitud pendiente para un período
   * GET /tareo/extensiones/periodo/:periodoId/pendiente
   */
  @Get('periodo/:periodoId/pendiente')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async tieneSolicitudPendiente(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const pendiente = await this.extensionService.tieneSolicitudPendiente(
      user.id,
      periodoId,
      user.empresa_id,
    );
    return { pendiente };
  }

  /**
   * Obtener detalle de una solicitud
   * GET /tareo/extensiones/:id
   */
  @Get(':id')
  @RequirePermissions(PERMISOS.TAREO.EDITAR)
  async obtenerSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.extensionService.obtenerSolicitud(id, user.empresa_id);
  }

  /**
   * Responder solicitud (aprobar/rechazar)
   * PATCH /tareo/extensiones/:id
   */
  @Patch(':id')
  @RequirePermissions(PERMISOS.TAREO.CORREGIR)
  async responderSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResponderExtensionDto,
  ) {
    return this.extensionService.responderSolicitud(
      id,
      dto,
      user.id,
      user.empresa_id,
    );
  }
}
