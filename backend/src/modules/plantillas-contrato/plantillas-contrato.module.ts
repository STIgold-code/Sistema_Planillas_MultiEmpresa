import { Module } from '@nestjs/common';
import { PlantillasContratoService } from './plantillas-contrato.service';
import { PlantillasContratoDocsService } from './plantillas-contrato-docs.service';
import { PlantillasContratoController } from './plantillas-contrato.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [PlantillasContratoController],
  providers: [PlantillasContratoService, PlantillasContratoDocsService],
  exports: [PlantillasContratoService],
})
export class PlantillasContratoModule {}
