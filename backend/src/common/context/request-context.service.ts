import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto del request que se propaga a través de toda la ejecución
 * Permite acceder a datos del usuario en cualquier parte del código,
 * incluyendo Prisma middlewares donde no hay acceso al request HTTP
 */
export interface RequestContext {
  userId: number | null;
  userEmail: string | null;
  empresaId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
}

@Injectable()
export class RequestContextService {
  private static storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Ejecuta una función dentro de un contexto específico
   */
  static run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Obtiene el contexto actual del request
   */
  static getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Obtiene el ID del usuario actual
   */
  static getUserId(): number | null {
    return this.getContext()?.userId ?? null;
  }

  /**
   * Obtiene el email del usuario actual
   */
  static getUserEmail(): string | null {
    return this.getContext()?.userEmail ?? null;
  }

  /**
   * Obtiene el ID de la empresa actual
   */
  static getEmpresaId(): number | null {
    return this.getContext()?.empresaId ?? null;
  }

  /**
   * Obtiene la IP del cliente
   */
  static getIpAddress(): string | null {
    return this.getContext()?.ipAddress ?? null;
  }

  /**
   * Crea un contexto vacío (para operaciones sin usuario autenticado)
   */
  static createEmptyContext(): RequestContext {
    return {
      userId: null,
      userEmail: null,
      empresaId: null,
      ipAddress: null,
      userAgent: null,
      method: null,
      path: null,
    };
  }
}
