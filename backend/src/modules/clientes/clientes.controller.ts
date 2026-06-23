import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('clientes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @RequirePermissions('maestros:crear')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClienteDto) {
    return this.clientesService.create(user.empresa_id, dto);
  }

  @Get()
  @RequirePermissions('maestros:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('buscar') buscar?: string,
    @Query('activo') activo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientesService.findAll(empresaId, {
      buscar,
      activo: activo !== undefined ? activo === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('select')
  @RequirePermissions('maestros:leer')
  findForSelect(@CurrentUser('empresa_id') empresaId: number) {
    return this.clientesService.findForSelect(empresaId);
  }

  @Get(':id')
  @RequirePermissions('maestros:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.clientesService.findOne(id, empresaId);
  }

  @Patch(':id')
  @RequirePermissions('maestros:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/toggle-activo')
  @RequirePermissions('maestros:editar')
  toggleActivo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientesService.toggleActivo(id, user.empresa_id);
  }

  @Delete(':id')
  @RequirePermissions('maestros:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.clientesService.remove(id, user.empresa_id);
  }
}
