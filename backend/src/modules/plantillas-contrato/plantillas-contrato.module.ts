import { Module } from '@nestjs/common';
import { PlantillasContratoService } from './plantillas-contrato.service';
import { PlantillasContratoGeneracionService } from './plantillas-contrato-generacion.service';
import { PlantillasContratoDocsService } from './plantillas-contrato-docs.service';
import { PlantillasContratoController } from './plantillas-contrato.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [PlantillasContratoController],
  providers: [
    PlantillasContratoService,
    PlantillasContratoGeneracionService,
    PlantillasContratoDocsService,
  ],
  exports: [PlantillasContratoService, PlantillasContratoGeneracionService],
})
export class PlantillasContratoModule {}
