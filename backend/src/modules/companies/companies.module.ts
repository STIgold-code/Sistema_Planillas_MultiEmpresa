import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { UploadsModule } from '../uploads/uploads.module';
import { ApiPeruModule } from '../../shared/apiperu/apiperu.module';

@Module({
  imports: [UploadsModule, ApiPeruModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
