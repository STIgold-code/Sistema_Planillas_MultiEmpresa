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
import { InventarioBajasService } from './inventario-bajas.service';
import { CreateBajaDto, RechazarBajaDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventario/bajas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventarioBajasController {
  constructor(private readonly service: InventarioBajasService) {}

  /** Operario: solicita la baja (queda pendiente de aprobación). */
  @Post()
  @RequirePermissions('inventarios:baja_solicitar')
  solicitar(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateBajaDto,
  ) {
    return this.service.solicitar(user.empresa_id, user.id, dto);
  }

  /** Admin: da de baja directamente (sin pasar por aprobación). */
  @Post('directa')
  @RequirePermissions('inventarios:baja_aprobar')
  bajaDirecta(
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: CreateBajaDto,
  ) {
    return this.service.bajaDirecta(user.empresa_id, user.id, dto);
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

  @Get('pendientes')
  @RequirePermissions('inventarios:leer')
  findPendientes(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.findPendientes(empresaId);
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
  @RequirePermissions('inventarios:baja_aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; empresa_id: number },
  ) {
    return this.service.aprobar(id, user.empresa_id, user.id);
  }

  @Patch(':id/rechazar')
  @RequirePermissions('inventarios:baja_aprobar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; empresa_id: number },
    @Body() dto: RechazarBajaDto,
  ) {
    return this.service.rechazar(id, user.empresa_id, user.id, dto);
  }
}
