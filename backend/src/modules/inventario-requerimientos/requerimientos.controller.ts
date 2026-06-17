import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequerimientosService } from './requerimientos.service';
import { RequerimientosExportService } from './requerimientos-export.service';
import {
  CreateRequerimientoDto,
  GuardarEmpleadoDto,
  EmpleadosLoteDto,
  EmpleadosCandidatosQueryDto,
  GuardarItemsDto,
  AsignarProveedorDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventario/requerimientos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RequerimientosController {
  constructor(
    private readonly service: RequerimientosService,
    private readonly exportService: RequerimientosExportService,
  ) {}

  @Post()
  @RequirePermissions('inventarios:requerimientos')
  create(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateRequerimientoDto,
  ) {
    return this.service.create(user.empresa_id, user.id, dto);
  }

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(empresaId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // Debe declararse ANTES de @Get(':id') para que NestJS no lo interprete como
  // un parámetro dinámico y lo enrute correctamente.
  @Get('pendientes-aprobacion')
  @RequirePermissions('inventarios:leer')
  pendientesAprobacion(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.pendientesAprobacion(empresaId);
  }

  @Delete(':id')
  @RequirePermissions('inventarios:requerimientos')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.remove(id, empresaId);
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }

  @Get(':id/consolidado')
  @RequirePermissions('inventarios:leer')
  consolidado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.consolidado(id, empresaId);
  }

  @Get(':id/planificacion')
  @RequirePermissions('inventarios:leer')
  planificacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.planificacion(id, empresaId);
  }

  @Get(':id/tallas-empleado/:empleadoId')
  @RequirePermissions('inventarios:requerimientos')
  tallasEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.tallasEmpleado(empleadoId, empresaId);
  }

  @Get(':id/empleados-candidatos')
  @RequirePermissions('inventarios:leer')
  empleadosCandidatos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Query() query: EmpleadosCandidatosQueryDto,
  ) {
    return this.service.empleadosCandidatos(id, empresaId, query);
  }

  @Put(':id/empleado')
  @RequirePermissions('inventarios:requerimientos')
  guardarEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: GuardarEmpleadoDto,
  ) {
    return this.service.guardarEmpleado(id, empresaId, dto);
  }

  @Put(':id/empleados-lote')
  @RequirePermissions('inventarios:requerimientos')
  guardarEmpleadosLote(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: EmpleadosLoteDto,
  ) {
    return this.service.guardarEmpleadosLote(id, empresaId, dto);
  }

  // Guarda los ítems sueltos (sin empleado) = lista de compra del requerimiento.
  @Put(':id/items')
  @RequirePermissions('inventarios:requerimientos')
  guardarItems(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: GuardarItemsDto,
  ) {
    return this.service.guardarItems(id, empresaId, dto);
  }

  // Agrega al requerimiento la dotación estándar de todos los empleados que
  // matchean el filtro (mismo filtro que la lista de candidatos). Solicita en
  // lote; no asigna ni entrega.
  @Post(':id/agregar-todos')
  @RequirePermissions('inventarios:requerimientos')
  agregarTodos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Query() query: EmpleadosCandidatosQueryDto,
  ) {
    return this.service.agregarTodos(id, empresaId, query);
  }

  // Asignar o cambiar el proveedor (destinatario del cargo). Solo en BORRADOR.
  @Patch(':id/proveedor')
  @RequirePermissions('inventarios:requerimientos')
  asignarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: AsignarProveedorDto,
  ) {
    return this.service.asignarProveedor(id, empresaId, dto.proveedor_id);
  }

  // El admin aprueba el requerimiento; recién ahí el cargo (PDF) vale y el
  // operario va a comprar.
  @Patch(':id/aprobar')
  @RequirePermissions('inventarios:requerimientos_aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; empresa_id: number },
  ) {
    return this.service.aprobar(id, user.empresa_id, user.id);
  }

  @Patch(':id/rechazar')
  @RequirePermissions('inventarios:requerimientos_aprobar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.rechazar(id, empresaId);
  }

  @Patch(':id/finalizar')
  @RequirePermissions('inventarios:requerimientos_aprobar')
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.finalizar(id, empresaId);
  }

  @Get(':id/export/excel')
  @RequirePermissions('inventarios:leer')
  async exportExcel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const wb = await this.exportService.excel(id, empresaId);
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Requerimiento_${id}.xlsx"`,
    });
    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  @Get(':id/export/pdf')
  @RequirePermissions('inventarios:leer')
  async exportPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.exportService.pdf(id, empresaId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Requerimiento_${id}.pdf"`,
    });
    return new StreamableFile(buffer);
  }
}
