import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Prisma } from '@prisma/client';
import {
  hasPermission,
  PERMISO_TOTAL,
} from '../../common/constants/permissions';

/**
 * Configuración de seguridad para hashing de contraseñas
 */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Includes comunes para queries de usuario
 */
const USER_INCLUDES = {
  rol: true,
  empresa: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  /**
   * Excluye el campo password de un objeto usuario
   * Centraliza la lógica para evitar duplicación
   */
  private sanitizeUser<T extends { password: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Verifica si un email ya está registrado (excluyendo un ID opcional)
   */
  private async checkEmailUniqueness(
    email: string,
    excludeId?: number,
  ): Promise<void> {
    const whereClause: Prisma.UsuarioWhereInput = { email };
    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const existingUser = await this.prisma.usuario.findFirst({
      where: whereClause,
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }
  }

  /**
   * SEGURIDAD: Valida que un rol exista, esté activo y pertenezca a la empresa
   * Previene escalación de privilegios al asignar roles de otras empresas
   * @returns Array de permisos del rol validado
   */
  private async validateRol(
    rolId: number,
    empresaId: number,
  ): Promise<string[]> {
    const rol = await this.prisma.rol.findUnique({
      where: { id: rolId },
    });

    if (!rol) {
      throw new BadRequestException('El rol especificado no existe');
    }

    if (rol.empresa_id !== empresaId) {
      throw new BadRequestException(
        'El rol no pertenece a la empresa del usuario',
      );
    }

    if (!rol.activo) {
      throw new BadRequestException('El rol especificado no está activo');
    }

    return rol.permisos;
  }

  /**
   * SEGURIDAD: Valida que el usuario actual tenga los permisos del rol que intenta asignar
   * Previene escalación de privilegios: un usuario no puede otorgar permisos que no tiene
   */
  private validateRolPermissions(
    rolPermisos: string[],
    userPermisos: string[],
  ): void {
    // Si el usuario tiene permiso total, puede asignar cualquier rol
    if (userPermisos.includes(PERMISO_TOTAL)) {
      return;
    }

    const permisosNoAutorizados: string[] = [];

    for (const permiso of rolPermisos) {
      // Si el rol tiene permiso total y el usuario no es superadmin
      if (permiso === PERMISO_TOTAL) {
        throw new ForbiddenException(
          'Solo un superadmin puede asignar roles con permisos totales (*)',
        );
      }

      // Verificar que el usuario tiene el permiso que intenta asignar
      if (!hasPermission(userPermisos, permiso)) {
        permisosNoAutorizados.push(permiso);
      }
    }

    if (permisosNoAutorizados.length > 0) {
      throw new ForbiddenException(
        `No puede asignar un rol con permisos que usted no tiene: ${permisosNoAutorizados.join(', ')}`,
      );
    }
  }

  /**
   * SEGURIDAD: Valida que la empresa tenga al menos un usuario con permisos de gestión
   * después de la operación (eliminación o desactivación)
   */
  private async validateLastAdminProtection(
    empresaId: number,
    excludeUserId: number,
  ): Promise<void> {
    // Contar usuarios activos con permisos de gestión de usuarios (excluyendo el actual)
    const adminsRestantes = await this.prisma.usuario.count({
      where: {
        empresa_id: empresaId,
        activo: true,
        id: { not: excludeUserId },
        rol: {
          activo: true,
          OR: [
            { permisos: { has: PERMISO_TOTAL } },
            { permisos: { has: 'usuarios:*' } },
            { permisos: { has: 'usuarios:crear' } },
          ],
        },
      },
    });

    if (adminsRestantes === 0) {
      throw new ForbiddenException(
        'No se puede realizar esta operación. La empresa debe tener al menos un usuario administrador activo con permisos de gestión de usuarios.',
      );
    }
  }

  /**
   * SEGURIDAD: empresaId es OBLIGATORIO para prevenir acceso cross-tenant
   */
  async findAll(empresaId: number, page: number = 1, limit: number = 50) {
    // Validar parámetros de paginación
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    const whereClause: Prisma.UsuarioWhereInput = { empresa_id: empresaId };
    const skip = (validatedPage - 1) * validatedLimit;

    const [users, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where: whereClause,
        skip,
        take: validatedLimit,
        include: USER_INCLUDES,
        orderBy: { nombre_completo: 'asc' },
      }),
      this.prisma.usuario.count({ where: whereClause }),
    ]);

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: {
        total,
        page: validatedPage,
        limit: validatedLimit,
        totalPages: Math.ceil(total / validatedLimit),
      },
    };
  }

  /**
   * SEGURIDAD: empresaId es OBLIGATORIO para prevenir acceso cross-tenant
   */
  async findOne(id: number, empresaId: number) {
    const whereClause: Prisma.UsuarioWhereInput = { id, empresa_id: empresaId };

    const user = await this.prisma.usuario.findFirst({
      where: whereClause,
      include: USER_INCLUDES,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async create(
    createUserDto: CreateUserDto,
    empresaId: number,
    userPermisos: string[] = [],
  ) {
    // SEGURIDAD: Validar que el rol existe, está activo y pertenece a la empresa
    const rolPermisos = await this.validateRol(createUserDto.rol_id, empresaId);

    // SEGURIDAD: Validar que el usuario puede asignar este rol (previene escalación de privilegios)
    this.validateRolPermissions(rolPermisos, userPermisos);

    // Verificar si el email ya existe
    await this.checkEmailUniqueness(createUserDto.email);

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      BCRYPT_SALT_ROUNDS,
    );

    // Extraer campos explícitamente para evitar mass assignment
    const { email, nombre_completo, rol_id, activo } = createUserDto;

    const user = await this.prisma.usuario.create({
      data: {
        email,
        nombre_completo,
        rol_id,
        activo: activo ?? true,
        password: hashedPassword,
        empresa_id: empresaId,
      },
      include: USER_INCLUDES,
    });

    this.logger.log(`Usuario creado: ${user.email} (ID: ${user.id})`);

    return this.sanitizeUser(user);
  }

  /**
   * SEGURIDAD: empresaId es OBLIGATORIO para prevenir acceso cross-tenant
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    empresaId: number,
    currentUserId: number,
    userPermisos: string[] = [],
  ) {
    // Verificar que el usuario existe y pertenece a la empresa
    const existingUser = await this.findOne(id, empresaId);

    // SEGURIDAD: Prevenir que un usuario se desactive a sí mismo
    if (currentUserId === id && updateUserDto.activo === false) {
      throw new ForbiddenException(
        'No puede desactivar su propia cuenta. Solicite a otro administrador que realice esta operación.',
      );
    }

    // SEGURIDAD: Si se desactiva un usuario, validar que no sea el último admin
    if (updateUserDto.activo === false && existingUser.activo === true) {
      await this.validateLastAdminProtection(empresaId, id);
    }

    // SEGURIDAD: Si se actualiza el rol, validar que sea válido para la empresa
    // y que el usuario actual tenga los permisos del nuevo rol
    if (updateUserDto.rol_id) {
      const rolPermisos = await this.validateRol(
        updateUserDto.rol_id,
        empresaId,
      );
      this.validateRolPermissions(rolPermisos, userPermisos);
    }

    // Si se actualiza el email, verificar que no exista
    if (updateUserDto.email) {
      await this.checkEmailUniqueness(updateUserDto.email, id);
    }

    // Construir datos a actualizar (evitar spread con any)
    const dataToUpdate: Prisma.UsuarioUpdateInput = {};
    const passwordChanged = !!updateUserDto.password;

    if (updateUserDto.email !== undefined) {
      dataToUpdate.email = updateUserDto.email;
    }
    if (updateUserDto.nombre_completo !== undefined) {
      dataToUpdate.nombre_completo = updateUserDto.nombre_completo;
    }
    if (updateUserDto.rol_id !== undefined) {
      dataToUpdate.rol = { connect: { id: updateUserDto.rol_id } };
    }
    if (updateUserDto.activo !== undefined) {
      dataToUpdate.activo = updateUserDto.activo;
    }
    if (passwordChanged) {
      dataToUpdate.password = await bcrypt.hash(
        updateUserDto.password,
        BCRYPT_SALT_ROUNDS,
      );
    }

    const user = await this.prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      include: USER_INCLUDES,
    });

    // SEGURIDAD: Si cambió la contraseña, revocar todos los tokens existentes
    if (passwordChanged) {
      try {
        await this.authService.revokeAllUserTokens(id);
        this.logger.log(
          `Tokens revocados para usuario ${id} después de cambio de contraseña`,
        );
      } catch (error) {
        // Loggear el error pero no fallar la operación (la contraseña ya cambió)
        this.logger.error(
          `Error revocando tokens para usuario ${id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Usuario actualizado: ${user.email} (ID: ${user.id})`);

    return this.sanitizeUser(user);
  }

  /**
   * SEGURIDAD: empresaId es OBLIGATORIO para prevenir acceso cross-tenant
   * SEGURIDAD: Implementa SOFT DELETE - desactiva en lugar de eliminar
   */
  async remove(id: number, empresaId: number, currentUserId: number) {
    // Verificar que el usuario existe y pertenece a la empresa
    const user = await this.findOne(id, empresaId);

    // SEGURIDAD: Prevenir que un usuario se elimine a sí mismo
    if (currentUserId === id) {
      throw new ForbiddenException(
        'No puede eliminar su propia cuenta. Solicite a otro administrador que realice esta operación.',
      );
    }

    // SEGURIDAD: Validar que no sea el último admin de la empresa
    await this.validateLastAdminProtection(empresaId, id);

    // SOFT DELETE: En lugar de eliminar, desactivamos el usuario
    await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });

    // Revocar todos los tokens del usuario eliminado
    try {
      await this.authService.revokeAllUserTokens(id);
    } catch (error) {
      this.logger.error(
        `Error revocando tokens para usuario eliminado ${id}: ${error.message}`,
      );
    }

    this.logger.log(
      `Usuario desactivado (soft delete): ${user.email} (ID: ${id})`,
    );

    return { message: 'Usuario eliminado correctamente' };
  }
}
