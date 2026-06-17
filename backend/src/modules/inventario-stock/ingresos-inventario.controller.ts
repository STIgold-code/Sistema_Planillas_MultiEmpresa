import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { IngresosInventarioService } from './ingresos-inventario.service';
import { IngresosInventarioExportService } from './ingresos-inventario-export.service';
import { CreateIngresoDto, CreateIngresoFacturaDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EXCEL_MIME } from '../../common/utils/excel-export.util';

@Controller('inventario/ingresos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IngresosInventarioController {
  constructor(
    private readonly service: IngresosInventarioService,
    private readonly exportService: IngresosInventarioExportService,
  ) {}

  @Get(':id/export/excel')
  @RequirePermissions('inventarios:leer')
  async exportDetalle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const wb = await this.exportService.excelDetalle(id, empresaId);
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': EXCEL_MIME,
      'Content-Disposition': `attachment; filename="Ingreso_${id}.xlsx"`,
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Post()
  @RequirePermissions('inventarios:gestionar_stock')
  create(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateIngresoDto,
  ) {
    return this.service.create(user.empresa_id, user.id, dto);
  }

  /**
   * Digitaliza la factura del proveedor: cabecera + líneas + archivo adjunto.
   * Al confirmar, carga las prendas de la factura al stock.
   */
  @Post('factura')
  @RequirePermissions('inventarios:gestionar_stock')
  createFactura(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateIngresoFacturaDto,
  ) {
    return this.service.createFactura(user.empresa_id, user.id, dto);
  }

  /**
   * Comparativa pedido-vs-recibido de un requerimiento aprobado, para mostrar
   * el delta entre lo solicitado y lo que ya cargaron las facturas.
   */
  @Get('comparativa/:requerimientoId')
  @RequirePermissions('inventarios:leer')
  comparativa(
    @Param('requerimientoId', ParseIntPipe) requerimientoId: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.comparativa(requerimientoId, empresaId);
  }

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      empresaId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }
}
