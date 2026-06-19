import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PlanillasService } from './planillas.service';
import {
  CreatePlanillaDto,
  UpdatePlanillaDetalleDto,
  FilterPlanillaDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { IsOptional, IsString } from 'class-validator';

// DTO para rechazar/anular con motivo
class MotivoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}

@Controller('planillas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) {}

  @Get()
  @RequirePermissions('planilla:leer')
  findAll(@CurrentUser() user: any, @Query() filters: FilterPlanillaDto) {
    return this.planillasService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('planilla:leer')
  getResumen(@CurrentUser() user: any) {
    return this.planillasService.getResumen(user.empresa_id);
  }

  @Get(':id')
  @RequirePermissions('planilla:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.planillasService.findOne(id, user.empresa_id);
  }

  // Endpoint para obtener detalles paginados (útil para planillas grandes)
  @Get(':id/detalles')
  @RequirePermissions('planilla:leer')
  findOneDetalles(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('search') search?: string,
  ) {
    return this.planillasService.findOneDetalles(
      id,
      user.empresa_id,
      page,
      limit,
      search,
    );
  }

  @Get(':id/exportar')
  @RequirePermissions('planilla:leer')
  exportar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.planillasService.exportar(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('planilla:crear')
  create(@Body() dto: CreatePlanillaDto, @CurrentUser() user: any) {
    return this.planillasService.create(user.empresa_id, dto, user.id);
  }

  @Post(':id/calcular')
  @RequirePermissions('planilla:crear')
  calcular(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.planillasService.calcular(id, user.empresa_id, user.id);
  }

  @Patch(':id/detalle/:detalleId')
  @RequirePermissions('planilla:editar')
  updateDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdatePlanillaDetalleDto,
    @CurrentUser() user: any,
  ) {
    return this.planillasService.updateDetalle(
      id,
      detalleId,
      user.empresa_id,
      dto,
      user.id,
    );
  }

  @Post(':id/aprobar')
  @RequirePermissions('planilla:aprobar')
  aprobar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.planillasService.aprobar(id, user.empresa_id, user.id);
  }

  @Post(':id/rechazar')
  @RequirePermissions('planilla:aprobar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: any,
  ) {
    return this.planillasService.rechazar(
      id,
      user.empresa_id,
      user.id,
      dto.motivo,
    );
  }

  @Post(':id/pagar')
  @RequirePermissions('planilla:aprobar')
  marcarPagada(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.planillasService.marcarPagada(id, user.empresa_id, user.id);
  }

  @Post(':id/anular')
  @RequirePermissions('planilla:eliminar')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
    @CurrentUser() user: any,
  ) {
    return this.planillasService.anular(
      id,
      user.empresa_id,
      user.id,
      dto.motivo,
    );
  }

  @Delete(':id')
  @RequirePermissions('planilla:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.planillasService.remove(id, user.empresa_id, user.id);
  }
}
