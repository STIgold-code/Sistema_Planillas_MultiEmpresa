import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../types/auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !user.rol || !user.rol.permisos) {
      return false;
    }

    const userPermissions: string[] = user.rol.permisos;

    // Super admin tiene acceso total
    if (userPermissions.includes('*')) {
      return true;
    }

    return requiredPermissions.some((permission) =>
      this.hasPermission(userPermissions, permission),
    );
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    // Verificar permiso exacto
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Verificar wildcards (ej: "empleados:*" incluye "empleados:leer")
    const [module] = requiredPermission.split(':');
    const wildcardPermission = `${module}:*`;

    return userPermissions.includes(wildcardPermission);
  }
}
