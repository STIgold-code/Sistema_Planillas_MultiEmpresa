import { Module } from '@nestjs/common';
import { MastersController } from './masters.controller';
import { MastersService } from './masters.service';
import { PensionRatesSchedulerService } from './services/pension-rates-scheduler.service';

@Module({
  controllers: [MastersController],
  providers: [MastersService, PensionRatesSchedulerService],
  exports: [MastersService],
})
export class MastersModule {}
