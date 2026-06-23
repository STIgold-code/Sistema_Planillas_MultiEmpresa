import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { RequestContextModule } from './common/context/request-context.module';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';
import { SentryAppModule } from './sentry/sentry.module';
import { FeatureFlagsModule } from './shared/feature-flags/feature-flags.module';

import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { MastersModule } from './modules/masters/masters.module';
import { EmpleadosModule } from './modules/empleados/empleados.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SeleccionModule } from './modules/seleccion/seleccion.module';
import { TareoModule } from './modules/tareo/tareo.module';
import { UbigeoModule } from './modules/ubigeo/ubigeo.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ContratosModule } from './modules/contratos/contratos.module';
import { PlantillasContratoModule } from './modules/plantillas-contrato/plantillas-contrato.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { PlanillasModule } from './modules/planillas/planillas.module';
import { BoletasModule } from './modules/boletas/boletas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { BancoDocumentosModule } from './modules/banco-documentos/banco-documentos.module';
import { VacacionesModule } from './modules/vacaciones/vacaciones.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { BackupModule } from './modules/backup/backup.module';
import { SolicitudesCeseModule } from './modules/solicitudes-cese/solicitudes-cese.module';
import { SolicitudesAnulacionModule } from './modules/solicitudes-anulacion/solicitudes-anulacion.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { TiposUniformeModule } from './modules/tipos-uniforme/tipos-uniforme.module';
import { CaracteristicasModule } from './modules/caracteristicas/caracteristicas.module';
import { PlantillasUniformeModule } from './modules/plantillas-uniforme/plantillas-uniforme.module';
import { InventarioStockModule } from './modules/inventario-stock/inventario-stock.module';
import { InventarioEntregasModule } from './modules/inventario-entregas/inventario-entregas.module';
import { InventarioDescuentosModule } from './modules/inventario-descuentos/inventario-descuentos.module';
import { InventarioBajasModule } from './modules/inventario-bajas/inventario-bajas.module';
import { InventarioRequerimientosModule } from './modules/inventario-requerimientos/inventario-requerimientos.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { MovimientosPersonalModule } from './modules/movimientos-personal/movimientos-personal.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // SEGURIDAD: Rate limiting global para prevenir ataques de fuerza bruta
    // Límites más permisivos para desarrollo, ajustar en producción
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 50, // 50 requests por segundo
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 500, // 500 requests por minuto
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 5000, // 5000 requests por hora
      },
    ]),
    // Observabilidad: Sentry (captura errores y performance)
    // La inicializacion ocurre en src/sentry/instrument.ts (importado en main.ts)
    SentryAppModule,
    // Feature Flags: @Global, exporta FeatureFlagsService a todos los modulos
    FeatureFlagsModule,
    // Contexto de request para auditoría automática (debe ir antes de PrismaModule)
    RequestContextModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    MastersModule,
    EmpleadosModule,
    DashboardModule,
    SeleccionModule,
    TareoModule,
    UbigeoModule,
    UploadsModule,
    ContratosModule,
    PlantillasContratoModule,
    SedesModule,
    PlanillasModule,
    BoletasModule,
    ClientesModule,
    BancoDocumentosModule,
    VacacionesModule,
    AuditoriaModule,
    OnboardingModule,
    BackupModule,
    SolicitudesCeseModule,
    SolicitudesAnulacionModule,
    ProveedoresModule,
    TiposUniformeModule,
    CaracteristicasModule,
    PlantillasUniformeModule,
    InventarioStockModule,
    InventarioEntregasModule,
    InventarioDescuentosModule,
    InventarioBajasModule,
    InventarioRequerimientosModule,
    ReportesModule,
    MovimientosPersonalModule,
  ],
  controllers: [HealthController],
  providers: [
    // SEGURIDAD: Guard de rate limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Guard de autenticación global
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Guard de permisos global
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Interceptor de contexto para auditoría (captura usuario después del guard)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
    // Filtro global: traduce errores conocidos de Prisma a respuestas HTTP
    // consistentes sin filtrar el detalle interno del ORM al cliente.
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}
