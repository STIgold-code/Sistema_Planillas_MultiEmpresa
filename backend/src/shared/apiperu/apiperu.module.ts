import { Module } from '@nestjs/common';
import { ApiPeruService } from './apiperu.service';

/**
 * Provee el servicio de consulta de documentos (RUC/DNI) vía apiperu.dev.
 * Se importa en los módulos que exponen los endpoints de consulta
 * (companies para RUC, seleccion para DNI).
 */
@Module({
  providers: [ApiPeruService],
  exports: [ApiPeruService],
})
export class ApiPeruModule {}
