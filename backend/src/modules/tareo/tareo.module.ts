import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailService } from '../../common/services/email.service';
import { PeriodosController } from './periodos.controller';
import { PeriodosService } from './periodos.service';
import { TareoController } from './tareo.controller';
import { TareoService } from './tareo.service';
import { TareoJustificacionesService } from './tareo-justificaciones.service';
import { TareoJustificacionesMutationsService } from './tareo-justificaciones-mutations.service';
import { TareoExcelService } from './tareo-excel.service';
import { TareoExcelExportService } from './tareo-excel-export.service';
import { SesionTareoController } from './sesion-tareo.controller';
import { SesionTareoService } from './sesion-tareo.service';
import { SesionTareoTasksService } from './sesion-tareo-tasks.service';
import { ExtensionTareoController } from './extension-tareo.controller';
import { ExtensionTareoService } from './extension-tareo.service';
import { TareoGrillaService } from './tareo-grilla.service';
import { TareoEdicionService } from './tareo-edicion.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [
    PeriodosController,
    TareoController,
    SesionTareoController,
    ExtensionTareoController,
  ],
  providers: [
    PeriodosService,
    TareoService,
    TareoJustificacionesService,
    TareoJustificacionesMutationsService,
    TareoGrillaService,
    TareoEdicionService,
    TareoExcelService,
    TareoExcelExportService,
    SesionTareoService,
    SesionTareoTasksService, // ERR-005: Cron para limpiar sesiones abandonadas
    ExtensionTareoService,
    EmailService,
  ],
  exports: [
    PeriodosService,
    TareoService,
    TareoJustificacionesService,
    TareoExcelService,
    SesionTareoService,
    ExtensionTareoService,
  ],
})
export class TareoModule {}
