import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import {
  getAllPermissionCodes,
  PERMISO_TOTAL,
  hasPermission,
} from '../../common/constants/permissions';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * SEGURIDAD: Valida que los permisos sean códigos válidos del sistema
   * y que el usuario que los asigna tenga esos permisos
   */
  private validatePermisos(permisos: string[], userPermisos: string[]): void {
    if (!permisos || permisos.length === 0) {
      return; // Un rol puede no tener permisos
    }

    const validCodes = getAllPermissionCodes();
    const invalidPermisos: string[] = [];

    for (const permiso of permisos) {
      // Permitir wildcards
      if (permiso === PERMISO_TOTAL || permiso.endsWith(':*')) {
        continue;
      }

      if (!validCodes.includes(permiso)) {
        invalidPermisos.push(permiso);
      }
    }

    if (invalidPermisos.length > 0) {
      throw new BadRequestException(
        `Permisos inválidos: ${invalidPermisos.join(', ')}`,
      );
    }

    // SEGURIDAD: Verificar que el usuario tiene los permisos que intenta asignar
    // Solo usuarios con * pueden asignar cualquier permiso
    if (!userPermisos.includes(PERMISO_TOTAL)) {
      const permisosNoAutorizados: string[] = [];

      for (const permiso of permisos) {
        // Si intenta asignar wildcard total y no es superadmin
        if (permiso === PERMISO_TOTAL) {
          throw new ForbiddenException(
            'Solo un superadmin puede otorgar permisos totales (*)',
          );
        }

        // Verificar que el usuario tiene el permiso que intenta asignar
        if (!hasPermission(userPermisos, permiso)) {
          permisosNoAutorizados.push(permiso);
        }
      }

      if (permisosNoAutorizados.length > 0) {
        throw new ForbiddenException(
          `No puede asignar permisos que usted no tiene: ${permisosNoAutorizados.join(', ')}`,
        );
      }
    }
  }

  async findAll(empresaId: number) {
    return this.prisma.rol.findMany({
      where: { empresa_id: empresaId },
      include: {
        empresa: true,
        _count: {
          select: { usuarios: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const role = await this.prisma.rol.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        empresa: true,
        _count: {
          select: { usuarios: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  async create(
    createRoleDto: CreateRoleDto,
    empresaId: number,
    userPermisos: string[] = [],
  ) {
    // SEGURIDAD: Validar permisos antes de crear el rol
    if (createRoleDto.permisos) {
      this.validatePermisos(createRoleDto.permisos, userPermisos);
    }

    // Verificar si ya existe un rol con el mismo nombre en la empresa
    const existingRole = await this.prisma.rol.findFirst({
      where: {
        nombre: createRoleDto.nombre,
        empresa_id: empresaId,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        'Ya existe un rol con ese nombre en esta empresa',
      );
    }

    return this.prisma.rol.create({
      data: {
        ...createRoleDto,
        empresa_id: empresaId,
      },
      include: {
        empresa: true,
      },
    });
  }

  async update(
    id: number,
    updateRoleDto: UpdateRoleDto,
    empresaId: number,
    userPermisos: string[] = [],
  ) {
    const rolExistente = await this.findOne(id, empresaId);

    // SEGURIDAD: Validar permisos antes de actualizar el rol
    if (updateRoleDto.permisos) {
      this.validatePermisos(updateRoleDto.permisos, userPermisos);
    }

    // Si se actualiza el nombre, verificar que no exista otro rol con ese nombre
    if (updateRoleDto.nombre) {
      const existingRole = await this.prisma.rol.findFirst({
        where: {
          nombre: updateRoleDto.nombre,
          empresa_id: rolExistente.empresa_id,
          NOT: { id },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          'Ya existe un rol con ese nombre en esta empresa',
        );
      }
    }

    return this.prisma.rol.update({
      where: { id },
      data: updateRoleDto,
      include: {
        empresa: true,
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const role = await this.findOne(id, empresaId);

    // Verificar si hay usuarios con este rol
    if (role._count.usuarios > 0) {
      throw new ConflictException(
        'No se puede eliminar el rol porque tiene usuarios asignados',
      );
    }

    await this.prisma.rol.delete({
      where: { id },
    });

    return { message: 'Rol eliminado correctamente' };
  }
}
