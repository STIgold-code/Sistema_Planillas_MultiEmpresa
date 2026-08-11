import { Module } from '@nestjs/common';
import { SolicitudesCorreccionFechasController } from './solicitudes-correccion-fechas.controller';
import { SolicitudesCorreccionFechasService } from './solicitudes-correccion-fechas.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [SolicitudesCorreccionFechasController],
  providers: [SolicitudesCorreccionFechasService],
  exports: [SolicitudesCorreccionFechasService],
})
export class SolicitudesCorreccionFechasModule {}
