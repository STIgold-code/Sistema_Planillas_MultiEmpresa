import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { FilesController } from './files.controller';
import { AlmacenamientoObjetosService } from './almacenamiento-objetos.service';

@Module({
  controllers: [UploadsController, FilesController],
  providers: [UploadsService, AlmacenamientoObjetosService],
  exports: [UploadsService, AlmacenamientoObjetosService],
})
export class UploadsModule {}
