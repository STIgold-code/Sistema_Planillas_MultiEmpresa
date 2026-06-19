import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  GenerarReporteDto,
  HistorialQueryDto,
  ContadorRegistrosDto,
} from './dto/reportes.dto';
import { REPORTES_IDS } from './reportes.constants';

interface AuthenticatedUser {
  id: number;
  email: string;
  empresa_id: number;
}

@Controller('reportes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  /**
   * GET /api/reportes/catalogo
   * Obtiene el catálogo completo de reportes disponibles
   */
  @Get('catalogo')
  @SkipThrottle()
  @RequirePermissions('reportes:leer')
  async getCatalogo(@CurrentUser() user: AuthenticatedUser) {
    return this.reportesService.getCatalogo(user.empresa_id);
  }

  /**
   * GET /api/reportes/config/:codigo
   * Obtiene la configuración de un reporte específico
   */
  @Get('config/:codigo')
  @SkipThrottle()
  @RequirePermissions('reportes:leer')
  async getReporteConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Param('codigo') codigo: string,
  ) {
    this.validarCodigoReporte(codigo);
    return this.reportesService.getReporteConfig(user.empresa_id, codigo);
  }

  /**
   * POST /api/reportes/contar
   * Cuenta los registros que retornaría el reporte
   */
  @Post('contar')
  @SkipThrottle()
  @RequirePermissions('reportes:leer')
  async contarRegistros(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ContadorRegistrosDto,
  ) {
    this.validarCodigoReporte(dto.codigo_reporte);
    return this.reportesService.contarRegistros(
      user.empresa_id,
      dto.codigo_reporte,
      dto.filtros || {},
    );
  }

  /**
   * POST /api/reportes/generar
   * Genera y descarga un reporte en Excel o PDF
   */
  @Post('generar')
  @RequirePermissions('reportes:generar')
  async generarReporte(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerarReporteDto,
    @Res() res: Response,
  ) {
    this.validarCodigoReporte(dto.codigo_reporte);

    const formato = dto.formato?.toLowerCase() || 'excel';

    if (formato === 'pdf') {
      // Generar PDF
      const { buffer, filename, totalRegistros } =
        await this.reportesService.generarReportePdf(
          { id: user.id, empresa_id: user.empresa_id, email: user.email },
          dto,
        );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('X-Total-Registros', totalRegistros.toString());
      res.send(buffer);
    } else {
      // Generar Excel
      const { workbook, filename, totalRegistros } =
        await this.reportesService.generarReporte(
          { id: user.id, empresa_id: user.empresa_id, email: user.email },
          dto,
        );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('X-Total-Registros', totalRegistros.toString());

      await workbook.xlsx.write(res);
      res.end();
    }
  }

  /**
   * GET /api/reportes/historial
   * Obtiene el historial de reportes generados
   */
  @Get('historial')
  @RequirePermissions('reportes:leer')
  async getHistorial(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HistorialQueryDto,
  ) {
    return this.reportesService.getHistorial(user.empresa_id, query);
  }

  /**
   * GET /api/reportes/preview/:codigo
   * Genera una vista previa con datos limitados
   */
  @Post('preview')
  @RequirePermissions('reportes:leer')
  async getPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ContadorRegistrosDto,
  ) {
    this.validarCodigoReporte(dto.codigo_reporte);

    // Usar el servicio para obtener datos pero limitado
    const config = await this.reportesService.getReporteConfig(
      user.empresa_id,
      dto.codigo_reporte,
    );

    const { total } = await this.reportesService.contarRegistros(
      user.empresa_id,
      dto.codigo_reporte,
      dto.filtros || {},
    );

    return {
      reporte: config,
      totalRegistros: total,
      // El preview real de datos se manejará en el frontend
      // con una llamada separada que limite los registros
    };
  }

  // ==================== UTILIDADES ====================

  private validarCodigoReporte(codigo: string): void {
    if (!REPORTES_IDS.includes(codigo)) {
      throw new BadRequestException(
        `Código de reporte inválido: '${codigo}'. Códigos válidos: ${REPORTES_IDS.join(', ')}`,
      );
    }
  }
}
