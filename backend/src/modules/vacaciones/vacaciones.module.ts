import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { VacacionesController } from './vacaciones.controller';
import { VacacionesService } from './vacaciones.service';
import { VacacionesTareoSyncService } from './vacaciones-tareo-sync.service';
import { VacacionesTasksService } from './vacaciones-tasks.service';
import { VacacionesSolicitudesService } from './vacaciones-solicitudes.service';
import { VacacionesAprobacionService } from './vacaciones-aprobacion.service';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [VacacionesController],
  providers: [
    VacacionesService,
    VacacionesSolicitudesService,
    VacacionesAprobacionService,
    VacacionesTareoSyncService,
    VacacionesTasksService,
  ],
  exports: [
    VacacionesService,
    VacacionesSolicitudesService,
    VacacionesTareoSyncService,
    VacacionesTasksService,
  ],
})
export class VacacionesModule {}
