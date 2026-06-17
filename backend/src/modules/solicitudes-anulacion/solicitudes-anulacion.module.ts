import { Module } from '@nestjs/common';
import { SolicitudesAnulacionController } from './solicitudes-anulacion.controller';
import { SolicitudesAnulacionService } from './solicitudes-anulacion.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [SolicitudesAnulacionController],
  providers: [SolicitudesAnulacionService],
  exports: [SolicitudesAnulacionService],
})
export class SolicitudesAnulacionModule {}
