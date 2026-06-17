import { Module } from '@nestjs/common';
import { MovimientosPersonalController } from './movimientos-personal.controller';
import { MovimientosPersonalService } from './movimientos-personal.service';

@Module({
  controllers: [MovimientosPersonalController],
  providers: [MovimientosPersonalService],
  exports: [MovimientosPersonalService],
})
export class MovimientosPersonalModule {}
