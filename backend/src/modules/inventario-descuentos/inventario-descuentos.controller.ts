import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { InventarioDescuentosService } from './inventario-descuentos.service';
import {
  CreateDescuentoDto,
  AprobarDescuentoDto,
  RechazarDescuentoDto,
  DescuentoMasivaDto,
  DescuentoCandidatosQueryDto,
  SolicitarTodosDescuentoDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventario/descuentos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventarioDescuentosController {
  constructor(private readonly service: InventarioDescuentosService) {}

  @Post()
  @RequirePermissions('inventarios:descontar_solicitar')
  create(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateDescuentoDto,
  ) {
    return this.service.create(user.empresa_id, user.id, dto);
  }

  // Descuento masivo: solicita descuentos a varios empleados de una vez. Por
  // cada empleado descuenta sus items entregados no devueltos.
  @Post('masiva')
  @RequirePermissions('inventarios:descontar_solicitar')
  crearMasiva(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: DescuentoMasivaDto,
  ) {
    return this.service.crearMasiva(user.empresa_id, user.id, dto);
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

  // Empleados candidatos para el descuento masivo, con el conteo de items
  // entregados no devueltos. Debe ir ANTES de ':id' para que el segmento
  // 'candidatos' no se interprete como un id.
  @Get('candidatos')
  @RequirePermissions('inventarios:leer')
  empleadosCandidatos(
    @CurrentUser('empresa_id') empresaId: number,
    @Query() query: DescuentoCandidatosQueryDto,
  ) {
    return this.service.empleadosCandidatos(empresaId, query);
  }

  @Get('pendientes')
  @RequirePermissions('inventarios:leer')
  findPendientes(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.findPendientes(empresaId);
  }

  // Solicita descuentos a TODOS los empleados que matcheen los filtros, sin
  // necesidad de que el frontend enumere empleado_ids. El servidor resuelve
  // la lista completa y crea las solicitudes en una transacción.
  // IMPORTANTE: debe declararse ANTES de cualquier @Get(':id') / @Patch(':id')
  // para que el segmento 'solicitar-todos' no sea interpretado como un :id.
  @Post('solicitar-todos')
  @RequirePermissions('inventarios:descontar_solicitar')
  solicitarTodos(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: SolicitarTodosDescuentoDto,
  ) {
    return this.service.solicitarTodos(user.empresa_id, user.id, dto);
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }

  @Patch(':id/aprobar')
  @RequirePermissions('inventarios:descontar_aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: AprobarDescuentoDto,
  ) {
    return this.service.aprobar(id, user.empresa_id, user.id, dto);
  }

  @Patch(':id/rechazar')
  @RequirePermissions('inventarios:descontar_aprobar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: RechazarDescuentoDto,
  ) {
    return this.service.rechazar(id, user.empresa_id, user.id, dto);
  }
}
