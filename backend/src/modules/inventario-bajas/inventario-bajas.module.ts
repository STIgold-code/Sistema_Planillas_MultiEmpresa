import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventarioBajasController } from './inventario-bajas.controller';
import { InventarioBajasService } from './inventario-bajas.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventarioBajasController],
  providers: [InventarioBajasService],
  exports: [InventarioBajasService],
})
export class InventarioBajasModule {}
