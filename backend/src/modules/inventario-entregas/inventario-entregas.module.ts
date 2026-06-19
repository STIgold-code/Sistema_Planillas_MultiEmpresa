import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventarioEntregasController } from './inventario-entregas.controller';
import { InventarioEntregasService } from './inventario-entregas.service';
import { InventarioEntregasExportService } from './inventario-entregas-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventarioEntregasController],
  providers: [InventarioEntregasService, InventarioEntregasExportService],
  exports: [InventarioEntregasService],
})
export class InventarioEntregasModule {}
