import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { RequestContextService } from '../context/request-context.service';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * Forma del usuario disponible en el request luego del JwtAuthGuard.
 * Se contempla `sub` como alternativa al `id` por compatibilidad con
 * payloads que aún lo incluyan.
 */
type RequestUser = Partial<AuthenticatedUser> & { sub?: number | string };

/**
 * Interceptor que actualiza el contexto del request con los datos del usuario.
 * Se ejecuta DESPUÉS del JwtAuthGuard, por lo que el usuario ya está disponible.
 *
 * Esto permite que Prisma middleware acceda a los datos del usuario
 * para registrar auditoría automáticamente.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    // Actualizar el contexto con los datos del usuario (si existe)
    const currentContext = RequestContextService.getContext();
    if (currentContext && user) {
      // Mutar el objeto de contexto existente
      const userId = user.id ?? user.sub ?? null;
      currentContext.userId = userId === null ? null : Number(userId);
      currentContext.userEmail = user.email ?? null;
      currentContext.empresaId = user.empresa_id ?? null;
    }

    return next.handle();
  }
}
