import { Module } from '@nestjs/common';
import { BoletasController } from './boletas.controller';
import { BoletasService } from './boletas.service';
import { BoletasPdfService } from './boletas-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { EmailService } from '../../common/services/email.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [BoletasController],
  providers: [BoletasService, BoletasPdfService, EmailService],
  exports: [BoletasService],
})
export class BoletasModule {}
