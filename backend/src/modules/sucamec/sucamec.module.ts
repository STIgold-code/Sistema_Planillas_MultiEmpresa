import { Module } from '@nestjs/common';
import { SucamecController } from './sucamec.controller';
import { SucamecService } from './sucamec.service';
import { SucamecTasksService } from './sucamec-tasks.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [SucamecController],
  providers: [SucamecService, SucamecTasksService],
  exports: [SucamecService, SucamecTasksService],
})
export class SucamecModule {}
