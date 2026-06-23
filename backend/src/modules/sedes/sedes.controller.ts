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
import { SedesService } from './sedes.service';
import {
  CreateSedeDto,
  UpdateSedeDto,
  FilterSedeDto,
  CreateSedeContactoDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Get()
  @RequirePermissions('maestros:leer')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filters: FilterSedeDto) {
    return this.sedesService.findAll(user.empresa_id, filters);
  }

  @Get('select')
  @RequirePermissions('maestros:leer')
  findForSelect(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cliente_id') clienteId?: string,
  ) {
    return this.sedesService.findForSelect(
      user.empresa_id,
      clienteId ? parseInt(clienteId, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermissions('maestros:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.sedesService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('maestros:crear')
  create(@Body() dto: CreateSedeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sedesService.create(user.empresa_id, dto);
  }

  @Patch(':id')
  @RequirePermissions('maestros:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSedeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sedesService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/toggle-activo')
  @RequirePermissions('maestros:editar')
  toggleActivo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sedesService.toggleActivo(id, user.empresa_id);
  }

  @Delete(':id')
  @RequirePermissions('maestros:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.sedesService.remove(id, user.empresa_id);
  }

  // ==================== CONTACTOS ====================

  @Post(':id/contactos')
  @RequirePermissions('maestros:crear')
  addContacto(
    @Param('id', ParseIntPipe) sedeId: number,
    @Body() dto: CreateSedeContactoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sedesService.addContacto(sedeId, user.empresa_id, dto);
  }

  @Patch('contactos/:contactoId')
  @RequirePermissions('maestros:editar')
  updateContacto(
    @Param('contactoId', ParseIntPipe) contactoId: number,
    @Body() dto: Partial<CreateSedeContactoDto>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sedesService.updateContacto(contactoId, user.empresa_id, dto);
  }

  @Delete('contactos/:contactoId')
  @RequirePermissions('maestros:eliminar')
  removeContacto(
    @Param('contactoId', ParseIntPipe) contactoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sedesService.removeContacto(contactoId, user.empresa_id);
  }
}
