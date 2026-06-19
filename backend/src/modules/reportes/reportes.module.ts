import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ReportesPdfService } from './reportes-pdf.service';
import { ReportesDataService } from './reportes-data.service';
import { ReportesDetalleService } from './reportes-detalle.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportesController],
  providers: [
    ReportesService,
    ReportesPdfService,
    ReportesDataService,
    ReportesDetalleService,
  ],
  exports: [ReportesService, ReportesPdfService, ReportesDataService],
})
export class ReportesModule {}
