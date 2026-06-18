import { Module } from '@nestjs/common';
import { PlanillasController } from './planillas.controller';
import { PlanillasService } from './planillas.service';
import { PlanillaDetalleService } from './planilla-detalle.service';
import { PlanillasCalcularService } from './planillas-calcular.service';
import { PlanillaPromediosService } from './planilla-promedios.service';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { PlanillaAuditoriaService } from './planilla-auditoria.service';
import { PlanillaCargaService } from './planilla-carga.service';

@Module({
  controllers: [PlanillasController],
  providers: [
    PlanillasService,
    PlanillaDetalleService,
    PlanillasCalcularService,
    PlanillaPromediosService,
    PlanillaParametrosService,
    PlanillaAuditoriaService,
    PlanillaCargaService,
  ],
  exports: [PlanillasService],
})
export class PlanillasModule {}
