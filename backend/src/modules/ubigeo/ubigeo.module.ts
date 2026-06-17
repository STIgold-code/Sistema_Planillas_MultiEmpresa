import { Module } from '@nestjs/common';
import { UbigeoController } from './ubigeo.controller';
import { UbigeoService } from './ubigeo.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UbigeoController],
  providers: [UbigeoService],
  exports: [UbigeoService],
})
export class UbigeoModule {}
