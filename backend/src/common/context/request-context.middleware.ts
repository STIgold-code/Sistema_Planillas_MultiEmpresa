import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  RequestContextService,
  RequestContext,
} from './request-context.service';

/**
 * Middleware que captura el contexto del request y lo hace disponible
 * en toda la cadena de ejecución, incluyendo Prisma middlewares.
 *
 * El usuario se extrae del request DESPUÉS de que el JwtAuthGuard lo procese.
 * Por eso este middleware solo prepara el contexto básico, y el contexto
 * completo (con usuario) se establece en el AuditInterceptor.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extraer IP del cliente (considerando proxies)
    const ipAddress = this.extractIp(req);

    // Crear contexto inicial (sin usuario, se agrega después del guard)
    const context: RequestContext = {
      userId: null,
      userEmail: null,
      empresaId: null,
      ipAddress,
      userAgent: req.headers['user-agent'] || null,
      method: req.method,
      path: req.originalUrl || req.url,
    };

    // Ejecutar el resto del request dentro del contexto
    RequestContextService.run(context, () => {
      next();
    });
  }

  private extractIp(req: Request): string | null {
    // Priorizar headers de proxy (Railway, Cloudflare, etc.)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return req.ip || req.socket?.remoteAddress || null;
  }
}
