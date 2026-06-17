import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditoriaService, FiltroAuditoriaParams } from './auditoria.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccionAuditoria } from '@prisma/client';
import { ahoraPeru } from '../../common/utils/datetime.util';
import {
  TABLAS_AUDITABLES,
  isTablaAuditable,
  parsePagination,
  parseIntSafe,
  parseDateSafe,
  AUDITORIA_PAGINATION,
} from './auditoria.constants';

/**
 * Interfaz para el usuario autenticado
 */
interface AuthenticatedUser {
  id: number;
  email: string;
  empresa_id: number;
}

@Controller('auditoria')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Obtiene el historial de una entidad específica
   * GET /api/auditoria/entidad/:tabla/:id
   *
   * SEGURIDAD:
   * - Valida que la tabla esté en la lista blanca
   * - Filtra por empresa_id del usuario autenticado
   * - Limita paginación para evitar DoS
   */
  @Get('entidad/:tabla/:id')
  @RequirePermissions('auditoria:leer')
  async getHistorialEntidad(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tabla') tabla: string,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validar tabla contra whitelist
    if (!isTablaAuditable(tabla)) {
      throw new BadRequestException(
        `Tabla no válida. Tablas permitidas: ${TABLAS_AUDITABLES.join(', ')}`,
      );
    }

    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    return this.auditoriaService.getHistorialEntidad(
      user.empresa_id,
      tabla,
      id,
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * Obtiene historial filtrado
   * GET /api/auditoria
   */
  @Get()
  @RequirePermissions('auditoria:leer')
  async getHistorial(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tabla') tabla?: string,
    @Query('registro_id') registroId?: string,
    @Query('usuario_id') usuarioId?: string,
    @Query('accion') accion?: AccionAuditoria,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validar tabla si se proporciona
    if (tabla && !isTablaAuditable(tabla)) {
      throw new BadRequestException(
        `Tabla no válida. Tablas permitidas: ${TABLAS_AUDITABLES.join(', ')}`,
      );
    }

    // Parsear fechas de forma segura
    const desde = parseDateSafe(fechaDesde);
    const hasta = parseDateSafe(fechaHasta);

    // Validar rango de fechas
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'fecha_desde no puede ser mayor que fecha_hasta',
      );
    }

    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    const filtros: FiltroAuditoriaParams = {
      tablaAfectada: tabla,
      registroId: parseIntSafe(registroId),
      usuarioId: parseIntSafe(usuarioId),
      accion,
      fechaDesde: desde,
      fechaHasta: hasta,
      page: parsedPage,
      limit: parsedLimit,
    };

    return this.auditoriaService.getHistorialFiltrado(user.empresa_id, filtros);
  }

  /**
   * Obtiene historial de vacantes
   * GET /api/auditoria/vacantes/:id
   */
  @Get('vacantes/:id')
  @RequirePermissions('seleccion:leer')
  async getHistorialVacante(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    return this.auditoriaService.getHistorialEntidad(
      user.empresa_id,
      'vacantes',
      id,
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * Obtiene historial de postulantes
   * GET /api/auditoria/postulantes/:id
   */
  @Get('postulantes/:id')
  @RequirePermissions('seleccion:leer')
  async getHistorialPostulante(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    return this.auditoriaService.getHistorialEntidad(
      user.empresa_id,
      'postulantes',
      id,
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * Obtiene historial de empleados
   * GET /api/auditoria/empleados/:id
   */
  @Get('empleados/:id')
  @RequirePermissions('empleados:leer')
  async getHistorialEmpleado(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    return this.auditoriaService.getHistorialEntidad(
      user.empresa_id,
      'empleados',
      id,
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * Obtiene historial de contratos
   * GET /api/auditoria/contratos/:id
   */
  @Get('contratos/:id')
  @RequirePermissions('contratos:leer')
  async getHistorialContrato(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: parsedPage, limit: parsedLimit } = parsePagination(
      page,
      limit,
    );

    return this.auditoriaService.getHistorialEntidad(
      user.empresa_id,
      'contratos',
      id,
      parsedPage,
      parsedLimit,
    );
  }

  /**
   * Obtiene resumen de actividad
   * GET /api/auditoria/resumen
   */
  @Get('resumen')
  @RequirePermissions('auditoria:leer')
  async getResumenActividad(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    const desde = fechaDesde
      ? parseDateSafe(fechaDesde) || ahoraPeru().minus({ months: 1 }).toJSDate()
      : ahoraPeru().minus({ months: 1 }).toJSDate();

    const hasta = fechaHasta
      ? parseDateSafe(fechaHasta) || ahoraPeru().toJSDate()
      : ahoraPeru().toJSDate();

    // Validar rango
    if (desde > hasta) {
      throw new BadRequestException(
        'fecha_desde no puede ser mayor que fecha_hasta',
      );
    }

    return this.auditoriaService.getResumenActividad(
      user.empresa_id,
      desde,
      hasta,
    );
  }

  /**
   * Exporta auditoría a Excel
   * GET /api/auditoria/exportar
   */
  @Get('exportar')
  @RequirePermissions('auditoria:leer')
  async exportarExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('tabla') tabla?: string,
    @Query('accion') accion?: AccionAuditoria,
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ) {
    // Validar tabla si se proporciona
    if (tabla && !isTablaAuditable(tabla)) {
      throw new BadRequestException(
        `Tabla no válida. Tablas permitidas: ${TABLAS_AUDITABLES.join(', ')}`,
      );
    }

    const desde = parseDateSafe(fechaDesde);
    const hasta = parseDateSafe(fechaHasta);

    // Validar rango de fechas
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'fecha_desde no puede ser mayor que fecha_hasta',
      );
    }

    const filtros: FiltroAuditoriaParams = {
      tablaAfectada: tabla,
      accion,
      fechaDesde: desde,
      fechaHasta: hasta,
      limit: AUDITORIA_PAGINATION.MAX_EXPORT_LIMIT,
    };

    const workbook = await this.auditoriaService.exportarExcel(
      user.empresa_id,
      filtros,
    );

    const fechaExport = ahoraPeru().toFormat('yyyy-MM-dd_HHmm');
    const fileName = `Auditoria_${fechaExport}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}
