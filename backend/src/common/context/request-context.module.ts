import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { RequestContextMiddleware } from './request-context.middleware';

/**
 * Módulo global que provee el contexto del request a toda la aplicación.
 * Permite acceder a datos del usuario autenticado desde cualquier parte,
 * incluyendo Prisma middlewares.
 */
@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar a todas las rutas
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
