import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  SentryModule as BaseSentryModule,
  SentryGlobalFilter,
} from '@sentry/nestjs/setup';

/**
 * Modulo de Sentry para NestJS.
 *
 * - Registra el SentryModule.forRoot() que habilita instrumentacion automatica
 * - Registra SentryGlobalFilter como exception filter global
 *   (captura excepciones no atrapadas y las envia a Sentry con contexto)
 *
 * La inicializacion de Sentry ocurre en backend/src/sentry/instrument.ts,
 * que debe importarse ANTES que cualquier otro modulo en main.ts.
 *
 * Este modulo debe importarse en AppModule.
 */
@Module({
  imports: [BaseSentryModule.forRoot()],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class SentryAppModule {}
