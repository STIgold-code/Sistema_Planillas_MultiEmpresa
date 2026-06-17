import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequerimientosController } from './requerimientos.controller';
import { RequerimientosService } from './requerimientos.service';
import { RequerimientosExportService } from './requerimientos-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [RequerimientosController],
  providers: [RequerimientosService, RequerimientosExportService],
  exports: [RequerimientosService],
})
export class InventarioRequerimientosModule {}
