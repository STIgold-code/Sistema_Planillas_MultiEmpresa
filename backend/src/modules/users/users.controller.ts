import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, PaginationQueryDto } from './dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('usuarios:leer')
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Obtiene la lista paginada de usuarios de la empresa del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver usuarios' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.usersService.findAll(
      user.empresa_id,
      paginationQuery.page,
      paginationQuery.limit,
    );
  }

  @Get(':id')
  @RequirePermissions('usuarios:leer')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene los detalles de un usuario específico',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para ver usuarios' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('usuarios:crear')
  @ApiOperation({
    summary: 'Crear usuario',
    description:
      'Crea un nuevo usuario. Solo puede asignar roles con permisos que el creador posee.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos para crear usuarios o escalada de privilegios detectada',
  })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(
      createUserDto,
      user.empresa_id,
      user.rol.permisos,
    );
  }

  @Patch(':id')
  @RequirePermissions('usuarios:editar')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description:
      'Actualiza los datos de un usuario existente. Cambios de rol están sujetos a validación de privilegios.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description:
      'Sin permisos para editar usuarios o escalada de privilegios detectada',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Email ya registrado por otro usuario',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
      user.empresa_id,
      user.id,
      user.rol.permisos,
    );
  }

  @Delete(':id')
  @RequirePermissions('usuarios:eliminar')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description:
      'Realiza una eliminación lógica (soft delete) del usuario. No se puede eliminar el último administrador.',
  })
  @ApiParam({ name: 'id', description: 'ID del usuario', type: Number })
  @ApiResponse({ status: 200, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para eliminar usuarios',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar el último administrador',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.remove(id, user.empresa_id, user.id);
  }
}
