import { Module } from '@nestjs/common';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { PrestamosPlanillaService } from './prestamos-planilla.service';
import { PrestamosAmortizacionService } from './prestamos-amortizacion.service';

/**
 * Préstamos y adelantos. Exporta los dos servicios que consume el módulo de
 * planillas: la lectura para el cálculo y la amortización al aprobar.
 */
@Module({
  controllers: [PrestamosController],
  providers: [
    PrestamosService,
    PrestamosPlanillaService,
    PrestamosAmortizacionService,
  ],
  exports: [PrestamosPlanillaService, PrestamosAmortizacionService],
})
export class PrestamosModule {}
