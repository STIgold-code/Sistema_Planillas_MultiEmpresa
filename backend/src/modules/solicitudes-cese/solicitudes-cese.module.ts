import { Module } from '@nestjs/common';
import { SolicitudesCeseController } from './solicitudes-cese.controller';
import { SolicitudesCeseService } from './solicitudes-cese.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [SolicitudesCeseController],
  providers: [SolicitudesCeseService],
  exports: [SolicitudesCeseService],
})
export class SolicitudesCeseModule {}
