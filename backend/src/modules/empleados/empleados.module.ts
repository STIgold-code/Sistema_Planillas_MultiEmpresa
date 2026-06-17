import { Module } from '@nestjs/common';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';
import { FileCleanupService } from './services/file-cleanup.service';
import { SbsConsultaService } from './services/sbs-consulta.service';
import { EmpleadoDocumentosService } from './services/empleado-documentos.service';
import { EmpleadoExportService } from './services/empleado-export.service';
import { EmpleadoPhotocheckService } from './services/empleado-photocheck.service';
import { EmpleadoMovimientosService } from './services/empleado-movimientos.service';
import { EmpleadoCrudService } from './services/empleado-crud.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [EmpleadosController],
  providers: [
    EmpleadosService,
    FileCleanupService,
    SbsConsultaService,
    EmpleadoDocumentosService,
    EmpleadoExportService,
    EmpleadoPhotocheckService,
    EmpleadoMovimientosService,
    EmpleadoCrudService,
  ],
  exports: [EmpleadosService, SbsConsultaService],
})
export class EmpleadosModule {}
