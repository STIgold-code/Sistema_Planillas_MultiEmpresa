import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Este guard es GLOBAL y además muchos controllers lo declaran localmente.
    // Si el request ya fue autenticado por la pasada global, NO se re-ejecuta
    // passport: una segunda validación reemplazaría `request.user` con un
    // objeto fresco de BD y PISARÍA el override de empresa activa que aplicó
    // EmpresaActivaGuard (que corre entre ambas pasadas).
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (request.user) {
      return true;
    }

    return super.canActivate(context);
  }
}
