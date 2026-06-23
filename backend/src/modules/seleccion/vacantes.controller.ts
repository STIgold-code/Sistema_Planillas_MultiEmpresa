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
} from '@nestjs/common';
import { VacantesService } from './vacantes.service';
import { CreateVacanteDto, UpdateVacanteDto, FilterVacanteDto } from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Get()
  @RequirePermissions('seleccion:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterVacanteDto,
  ) {
    return this.vacantesService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('seleccion:leer')
  getResumen(@CurrentUser() user: AuthenticatedUser) {
    return this.vacantesService.getResumen(user.empresa_id);
  }

  @Get(':id')
  @RequirePermissions('seleccion:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.findOne(id, user.empresa_id);
  }

  @Get(':id/estadisticas')
  @RequirePermissions('seleccion:leer')
  getEstadisticas(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.getEstadisticas(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('seleccion:crear')
  create(
    @Body() dto: CreateVacanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.create(user.empresa_id, dto);
  }

  @Patch(':id')
  @RequirePermissions('seleccion:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVacanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/publicar')
  @RequirePermissions('seleccion:editar')
  publicar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.cambiarEstado(id, user.empresa_id, 'PUBLICADA');
  }

  @Patch(':id/cerrar')
  @RequirePermissions('seleccion:editar')
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.cambiarEstado(id, user.empresa_id, 'CERRADA');
  }

  @Patch(':id/cancelar')
  @RequirePermissions('seleccion:editar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.cambiarEstado(id, user.empresa_id, 'CANCELADA');
  }

  @Patch(':id/reactivar')
  @RequirePermissions('seleccion:editar')
  reactivar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.cambiarEstado(id, user.empresa_id, 'BORRADOR');
  }

  @Delete(':id')
  @RequirePermissions('seleccion:eliminar')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vacantesService.remove(id, user.empresa_id);
  }
}
