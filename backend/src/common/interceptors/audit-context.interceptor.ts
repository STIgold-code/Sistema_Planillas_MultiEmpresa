import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';

/**
 * Interceptor que actualiza el contexto del request con los datos del usuario.
 * Se ejecuta DESPUÉS del JwtAuthGuard, por lo que el usuario ya está disponible.
 *
 * Esto permite que Prisma middleware acceda a los datos del usuario
 * para registrar auditoría automáticamente.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Actualizar el contexto con los datos del usuario (si existe)
    const currentContext = RequestContextService.getContext();
    if (currentContext && user) {
      // Mutar el objeto de contexto existente
      currentContext.userId = user.id ?? user.sub ?? null;
      currentContext.userEmail = user.email ?? null;
      currentContext.empresaId = user.empresa_id ?? null;
    }

    return next.handle();
  }
}
