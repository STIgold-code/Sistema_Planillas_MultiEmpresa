import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, AuthenticatedUserField } from '../types/auth.types';

/**
 * Decorador para obtener el usuario autenticado actual desde el request
 *
 * @example
 * // Obtener usuario completo
 * @CurrentUser() user: AuthenticatedUser
 *
 * @example
 * // Obtener campo específico
 * @CurrentUser('id') userId: number
 * @CurrentUser('empresa_id') empresaId: number
 */
export const CurrentUser = createParamDecorator(
  (
    data: AuthenticatedUserField | undefined,
    ctx: ExecutionContext,
  ):
    | AuthenticatedUser
    | AuthenticatedUser[AuthenticatedUserField]
    | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
