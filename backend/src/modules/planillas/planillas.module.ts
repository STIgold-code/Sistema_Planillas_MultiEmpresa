import { Module } from '@nestjs/common';
import { PlanillasController } from './planillas.controller';
import { PlanillasService } from './planillas.service';
import { PlanillaDetalleService } from './planilla-detalle.service';
import { PlanillasCalcularService } from './planillas-calcular.service';

@Module({
  controllers: [PlanillasController],
  providers: [
    PlanillasService,
    PlanillaDetalleService,
    PlanillasCalcularService,
  ],
  exports: [PlanillasService],
})
export class PlanillasModule {}
