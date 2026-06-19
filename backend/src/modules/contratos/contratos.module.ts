import { Module } from '@nestjs/common';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';
import { ContratosExcelService } from './contratos-excel.service';
import { ContratosExcelExportService } from './contratos-excel-export.service';
import { ContratosTasksService } from './contratos-tasks.service';
import { ContratoLifecycleService } from './contrato-lifecycle.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [ContratosController],
  providers: [
    ContratosService,
    ContratosExcelService,
    ContratosExcelExportService,
    ContratosTasksService,
    ContratoLifecycleService,
  ],
  exports: [
    ContratosService,
    ContratosExcelService,
    ContratosTasksService,
    ContratoLifecycleService,
  ],
})
export class ContratosModule {}
