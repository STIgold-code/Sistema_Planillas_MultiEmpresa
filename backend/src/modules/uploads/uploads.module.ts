import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { FilesController } from './files.controller';

@Module({
  controllers: [UploadsController, FilesController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
