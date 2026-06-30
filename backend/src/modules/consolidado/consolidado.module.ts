import { Module } from '@nestjs/common';
import { ConsolidadoController } from './consolidado.controller';
import { ConsolidadoService } from './consolidado.service';

@Module({
  controllers: [ConsolidadoController],
  providers: [ConsolidadoService],
})
export class ConsolidadoModule {}
