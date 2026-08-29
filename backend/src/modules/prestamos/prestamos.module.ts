import { Module } from '@nestjs/common';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { PrestamosPlanillaService } from './prestamos-planilla.service';
import { PrestamosAmortizacionService } from './prestamos-amortizacion.service';
import { UploadsModule } from '../uploads/uploads.module';

/**
 * Préstamos y adelantos. Exporta lo que consume el módulo de planillas: la
 * lectura para el cálculo, la amortización al aprobar, y el servicio de
 * escritura —dueño de las reglas de saldo y convenio— que usa la importación
 * de la plantilla de cierre.
 */
@Module({
  imports: [UploadsModule],
  controllers: [PrestamosController],
  providers: [
    PrestamosService,
    PrestamosPlanillaService,
    PrestamosAmortizacionService,
  ],
  exports: [
    PrestamosService,
    PrestamosPlanillaService,
    PrestamosAmortizacionService,
  ],
})
export class PrestamosModule {}
