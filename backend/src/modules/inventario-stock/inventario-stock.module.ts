import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { IngresosInventarioController } from './ingresos-inventario.controller';
import { IngresosInventarioService } from './ingresos-inventario.service';
import { IngresosInventarioExportService } from './ingresos-inventario-export.service';
import { ItemsInventarioController } from './items-inventario.controller';
import { ItemsInventarioService } from './items-inventario.service';
import { ItemsInventarioExportService } from './items-inventario-export.service';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import { MovimientosInventarioExportService } from './movimientos-inventario-export.service';
import { MovimientosInventarioController } from './movimientos-inventario.controller';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [
    IngresosInventarioController,
    ItemsInventarioController,
    MovimientosInventarioController,
  ],
  providers: [
    IngresosInventarioService,
    IngresosInventarioExportService,
    ItemsInventarioService,
    ItemsInventarioExportService,
    MovimientosInventarioService,
    MovimientosInventarioExportService,
  ],
  exports: [
    IngresosInventarioService,
    ItemsInventarioService,
    MovimientosInventarioService,
  ],
})
export class InventarioStockModule {}
