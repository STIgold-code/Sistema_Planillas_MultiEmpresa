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
import { InventarioEntregasService } from './inventario-entregas.service';
import { InventarioEntregasExportService } from './inventario-entregas-export.service';
import {
  CreateEntregaDto,
  DevolverItemsDto,
  EntregaMasivaDto,
  EntregaCandidatosQueryDto,
  EntregarTodosDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('inventario')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventarioEntregasController {
  constructor(
    private readonly service: InventarioEntregasService,
    private readonly exportService: InventarioEntregasExportService,
  ) {}

  // Export de la lista completa. Debe declararse ANTES de 'entregas/:id...'
  // para que el segmento 'export' no se interprete como un id.
  @Get('entregas/export/excel')
  @RequirePermissions('inventarios:leer')
  async exportLista(
    @CurrentUser('empresa_id') empresaId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const wb = await this.exportService.excelLista(empresaId);
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': EXCEL_MIME,
      'Content-Disposition': 'attachment; filename="Entregas.xlsx"',
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Get('entregas/:id/export/excel')
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
      'Content-Disposition': `attachment; filename="Entrega_${id}.xlsx"`,
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Post('entregas')
  @RequirePermissions('inventarios:entregar')
  crearEntrega(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateEntregaDto,
  ) {
    return this.service.crearEntrega(user.empresa_id, user.id, dto);
  }

  // Entrega masiva: reparte dotación a varios empleados de una sola vez.
  // Entrega lo disponible del stock y reporta los faltantes (no all-or-nothing).
  @Post('entregas/masiva')
  @RequirePermissions('inventarios:entregar')
  entregarMasiva(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: EntregaMasivaDto,
  ) {
    return this.service.entregarMasiva(user.empresa_id, user.id, dto);
  }

  // Entrega server-side: el servidor resuelve TODOS los candidatos que matcheen
  // los filtros, construye la dotación de cada uno y ejecuta la entrega masiva.
  // Debe declararse ANTES de 'entregas/:id' para que el segmento 'entregar-todos'
  // no sea interpretado como un id.
  @Post('entregas/entregar-todos')
  @RequirePermissions('inventarios:entregar')
  entregaTodos(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: EntregarTodosDto,
  ) {
    return this.service.entregaTodos(user.empresa_id, user.id, dto);
  }

  // Empleados candidatos para la entrega masiva (con sus tallas guardadas).
  // Debe ir ANTES de 'entregas/:id' para que el segmento no se tome como id.
  @Get('entregas/candidatos')
  @RequirePermissions('inventarios:leer')
  empleadosCandidatos(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() query: EntregaCandidatosQueryDto,
  ) {
    return this.service.empleadosCandidatos(empresaId, query);
  }

  // Stock DISPONIBLE por prenda + talla, para validar el reparto en el panel.
  @Get('entregas/disponibilidad')
  @RequirePermissions('inventarios:leer')
  disponibilidadStock(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.disponibilidadStock(empresaId);
  }

  @Get('entregas')
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

  @Get('entregas/:id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }

  @Post('devoluciones')
  @RequirePermissions('inventarios:entregar')
  devolver(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: DevolverItemsDto,
  ) {
    return this.service.devolver(user.empresa_id, user.id, dto);
  }

  @Get('empleados/:empleadoId/pendientes')
  @RequirePermissions('inventarios:leer')
  itemsPendientes(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.itemsPendientesEmpleado(empleadoId, empresaId);
  }
}
