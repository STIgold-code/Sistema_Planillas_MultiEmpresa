import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventarioDescuentosController } from './inventario-descuentos.controller';
import { InventarioDescuentosService } from './inventario-descuentos.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventarioDescuentosController],
  providers: [InventarioDescuentosService],
  exports: [InventarioDescuentosService],
})
export class InventarioDescuentosModule {}
