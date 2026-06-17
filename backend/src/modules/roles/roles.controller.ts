import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { PERMISOS_POR_MODULO } from '../../common/constants';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permisos-disponibles')
  @RequirePermissions('roles:leer')
  @ApiOperation({
    summary: 'Obtener permisos disponibles',
    description:
      'Retorna la lista de todos los permisos disponibles en el sistema, organizados por módulo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver roles' })
  getPermisosDisponibles() {
    return PERMISOS_POR_MODULO;
  }

  @Get()
  @RequirePermissions('roles:leer')
  @ApiOperation({
    summary: 'Listar roles',
    description:
      'Obtiene la lista de roles de la empresa del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver roles' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.findAll(user.empresa_id);
  }

  @Get(':id')
  @RequirePermissions('roles:leer')
  @ApiOperation({
    summary: 'Obtener rol por ID',
    description:
      'Obtiene los detalles de un rol específico incluyendo sus permisos',
  })
  @ApiParam({ name: 'id', description: 'ID del rol', type: Number })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver roles' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('roles:crear')
  @ApiOperation({
    summary: 'Crear rol',
    description:
      'Crea un nuevo rol. Solo puede asignar permisos que el creador posee.',
  })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o permisos inválidos',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos para crear roles o escalada de privilegios detectada',
  })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.create(
      createRoleDto,
      user.empresa_id,
      user.rol.permisos,
    );
  }

  @Patch(':id')
  @RequirePermissions('roles:editar')
  @ApiOperation({
    summary: 'Actualizar rol',
    description:
      'Actualiza los datos de un rol existente. Solo puede asignar permisos que el usuario posee.',
  })
  @ApiParam({ name: 'id', description: 'ID del rol', type: Number })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o permisos inválidos',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos para editar roles o escalada de privilegios detectada',
  })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.update(
      id,
      updateRoleDto,
      user.empresa_id,
      user.rol.permisos,
    );
  }

  @Delete(':id')
  @RequirePermissions('roles:eliminar')
  @ApiOperation({
    summary: 'Eliminar rol',
    description:
      'Elimina un rol. No se puede eliminar si tiene usuarios asignados.',
  })
  @ApiParam({ name: 'id', description: 'ID del rol', type: Number })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar roles' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar porque tiene usuarios asignados',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolesService.remove(id, user.empresa_id);
  }
}
