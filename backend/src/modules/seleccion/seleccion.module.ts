import { Module } from '@nestjs/common';
import { VacantesController } from './vacantes.controller';
import { VacantesService } from './vacantes.service';
import { PostulantesController } from './postulantes.controller';
import { PostulantesService } from './postulantes.service';
import { PostulanteConversionService } from './postulante-conversion.service';
import { PostulanteDocumentosService } from './postulante-documentos.service';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ApiPeruModule } from '../../shared/apiperu/apiperu.module';

@Module({
  imports: [OnboardingModule, UploadsModule, ApiPeruModule],
  controllers: [VacantesController, PostulantesController],
  providers: [
    VacantesService,
    PostulantesService,
    PostulanteConversionService,
    PostulanteDocumentosService,
  ],
  exports: [
    VacantesService,
    PostulantesService,
    PostulanteConversionService,
    PostulanteDocumentosService,
  ],
})
export class SeleccionModule {}
