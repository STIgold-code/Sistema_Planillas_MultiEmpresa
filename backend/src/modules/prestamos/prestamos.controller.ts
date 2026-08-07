import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PrestamosService } from './prestamos.service';
import {
  CancelarPrestamoDto,
  CreatePrestamoDto,
  FilterPrestamoDto,
  UpdatePrestamoDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { PERMISOS } from '../../common/constants/permissions';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  @Get()
  @RequirePermissions(PERMISOS.PRESTAMOS.LEER)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPrestamoDto,
  ) {
    return this.prestamosService.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.LEER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions(PERMISOS.PRESTAMOS.CREAR)
  create(
    @Body() dto: CreatePrestamoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.create(user.empresa_id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.EDITAR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrestamoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/cancelar')
  @RequirePermissions(PERMISOS.PRESTAMOS.EDITAR)
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarPrestamoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.cancelar(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.ELIMINAR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.remove(id, user.empresa_id);
  }
}
