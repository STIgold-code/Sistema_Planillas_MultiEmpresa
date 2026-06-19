import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { TareoService } from './tareo.service';
import { SesionTareoService } from './sesion-tareo.service';
import { PERMISOS } from '../../common/constants/permissions';
import {
  FilterTareoDto,
  UpdateTareoDetalleDto,
  BulkUpdateTareoDto,
  CreateJustificacionDto,
  UpdateJustificacionDto,
  AddArchivoDto,
  FilterJustificacionDto,
  FilterAlertasFaltasDto,
} from './dto';

@Controller('tareo')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TareoController {
  constructor(
    private readonly tareoService: TareoService,
    private readonly sesionTareoService: SesionTareoService,
  ) {}

  /**
   * Verifica si el usuario puede editar sin restricción de sesión
   * (admin con permiso total, o corrector designado)
   */
  private puedeEditarSinRestriccion(user: AuthenticatedUser): boolean {
    const permisos = user.rol?.permisos || [];
    // Admin tiene permiso total
    const esAdmin = permisos.includes('*');
    // Corrector designado
    const esCorrector =
      permisos.includes(PERMISOS.TAREO.CORREGIR) ||
      permisos.includes('tareo:*');

    return esAdmin || esCorrector;
  }

  // Obtener sedes de la empresa (para selects)
  @Get('sedes')
  @RequirePermissions('tareo:leer')
  getSedes(@CurrentUser() user: AuthenticatedUser) {
    return this.tareoService.getSedes(user.empresa_id);
  }

  // Obtener grilla completa del periodo
  @Get('periodos/:periodoId/grilla')
  @RequirePermissions('tareo:leer')
  getGrilla(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Query() filters: FilterTareoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getGrilla(periodoId, user.empresa_id, filters);
  }

  // Obtener alertas de faltas (empleados con >= 3 faltas en rango de fechas)
  @Get('alertas-faltas')
  @RequirePermissions('tareo:leer')
  getAlertasFaltas(
    @Query() filters: FilterAlertasFaltasDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getAlertasFaltas(user.empresa_id, {
      fecha_inicio: new Date(filters.fecha_inicio),
      fecha_fin: new Date(filters.fecha_fin),
      sede_id: filters.sede_id,
      area_id: filters.area_id,
      minimo_faltas: filters.minimo_faltas,
    });
  }

  // Obtener tareo de un empleado específico
  @Get('periodos/:periodoId/empleado/:empleadoId')
  @RequirePermissions('tareo:leer')
  getTareoEmpleado(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getTareoEmpleado(
      periodoId,
      empleadoId,
      user.empresa_id,
    );
  }

  // Obtener resumen de un empleado
  @Get('periodos/:periodoId/empleado/:empleadoId/resumen')
  @RequirePermissions('tareo:leer')
  getResumenEmpleado(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getResumenEmpleado(
      periodoId,
      empleadoId,
      user.empresa_id,
    );
  }

  // Actualizar una celda individual
  @Patch('detalle/:detalleId')
  @RequirePermissions('tareo:editar')
  async updateDetalle(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdateTareoDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sinRestriccion = this.puedeEditarSinRestriccion(user);

    // Obtener el periodo_id del detalle para validar sesión
    const detalle = await this.tareoService.getDetalleInfo(
      detalleId,
      user.empresa_id,
    );

    // Validar sesión de tareo (solo si no es corrector)
    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      detalle.periodo_id,
      user.id,
      user.empresa_id,
      sinRestriccion,
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.tareoService.updateDetalle(
      detalleId,
      user.empresa_id,
      user.id,
      dto,
      ipAddress,
      sinRestriccion, // ERR-001: Pasar flag para re-validación atómica
    );
  }

  // Actualización masiva de celdas
  @Patch('periodos/:periodoId/bulk')
  @RequirePermissions('tareo:editar')
  async bulkUpdate(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Body() dto: BulkUpdateTareoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sinRestriccion = this.puedeEditarSinRestriccion(user);

    // Validar sesión de tareo (solo si no es corrector)
    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      sinRestriccion,
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.tareoService.bulkUpdate(
      periodoId,
      user.empresa_id,
      user.id,
      dto,
      ipAddress,
      sinRestriccion, // ERR-002: Pasar flag para re-validación atómica
    );
  }

  // Obtener historial de cambios de un detalle
  @Get('detalle/:detalleId/historial')
  @RequirePermissions('tareo:auditoria')
  getHistorial(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getHistorial(detalleId, user.empresa_id);
  }

  // =============================================
  // JUSTIFICACIONES
  // =============================================

  // Listar todas las justificaciones con filtros y paginación
  @Get('justificaciones')
  @RequirePermissions('tareo:leer')
  getAllJustificaciones(
    @Query() filters: FilterJustificacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getAllJustificaciones(user.empresa_id, filters);
  }

  // Obtener días con justificación para un periodo (para indicadores en grilla)
  @Get('periodos/:periodoId/justificaciones/dias')
  @RequirePermissions('tareo:leer')
  getDiasConJustificacion(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getDiasConJustificacion(
      periodoId,
      user.empresa_id,
    );
  }

  // Obtener justificaciones de un tareo específico
  @Get('tareos/:tareoId/justificaciones')
  @RequirePermissions('tareo:leer')
  getJustificacionesByTareo(
    @Param('tareoId', ParseIntPipe) tareoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getJustificacionesByTareo(
      tareoId,
      user.empresa_id,
    );
  }

  // Obtener historial de justificaciones por empleado
  @Get('justificaciones/empleado/:empleadoId')
  @RequirePermissions('tareo:leer')
  getJustificacionesByEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('anio') anio?: string,
  ) {
    return this.tareoService.getJustificacionesByEmpleado(
      user.empresa_id,
      empleadoId,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  // Obtener detalle de una justificación
  @Get('justificaciones/:id')
  @RequirePermissions('tareo:leer')
  getJustificacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tareoService.getJustificacion(id, user.empresa_id);
  }

  // Crear justificación
  @Post('justificaciones')
  @RequirePermissions('tareo:editar')
  async createJustificacion(
    @Body() dto: CreateJustificacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Obtener periodo_id del tareo para validar sesión
    const periodoId = await this.tareoService.getTareoPeriodoId(
      dto.tareo_id,
      user.empresa_id,
    );

    // Validar sesión de tareo
    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      this.puedeEditarSinRestriccion(user),
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    return this.tareoService.createJustificacion(dto, user.id, user.empresa_id);
  }

  // Actualizar justificación
  @Patch('justificaciones/:id')
  @RequirePermissions('tareo:editar')
  async updateJustificacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJustificacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Obtener periodo_id de la justificación para validar sesión
    const periodoId = await this.tareoService.getJustificacionPeriodoId(
      id,
      user.empresa_id,
    );

    // Validar sesión de tareo
    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      this.puedeEditarSinRestriccion(user),
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    return this.tareoService.updateJustificacion(id, dto, user.empresa_id);
  }

  // Eliminar justificación
  @Delete('justificaciones/:id')
  @RequirePermissions('tareo:editar')
  async deleteJustificacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Obtener periodo_id de la justificación para validar sesión
    const periodoId = await this.tareoService.getJustificacionPeriodoId(
      id,
      user.empresa_id,
    );

    // Validar sesión de tareo
    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      this.puedeEditarSinRestriccion(user),
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    return this.tareoService.deleteJustificacion(id, user.empresa_id, user.id);
  }

  // Agregar archivo a justificación
  @Post('justificaciones/:id/archivos')
  @RequirePermissions('tareo:editar')
  async addArchivoToJustificacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddArchivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // SEC-001: Validar sesión de tareo antes de agregar archivo
    const periodoId = await this.tareoService.getJustificacionPeriodoId(
      id,
      user.empresa_id,
    );

    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      this.puedeEditarSinRestriccion(user),
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    return this.tareoService.addArchivoToJustificacion(
      id,
      dto,
      user.empresa_id,
    );
  }

  // Eliminar archivo de justificación
  @Delete('justificaciones/archivos/:archivoId')
  @RequirePermissions('tareo:editar')
  async removeArchivo(
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // SEC-001: Validar sesión de tareo antes de eliminar archivo
    const periodoId = await this.tareoService.getArchivoPeriodoId(
      archivoId,
      user.empresa_id,
    );

    const puedeEditar = await this.sesionTareoService.puedeEditarTareo(
      periodoId,
      user.id,
      user.empresa_id,
      this.puedeEditarSinRestriccion(user),
    );

    if (!puedeEditar.puede) {
      throw new ForbiddenException(puedeEditar.motivo);
    }

    return this.tareoService.removeArchivo(archivoId, user.empresa_id);
  }
}
