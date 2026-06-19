import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SesionTareoService } from './sesion-tareo.service';

@Injectable()
export class SesionTareoTasksService {
  private readonly logger = new Logger(SesionTareoTasksService.name);

  constructor(private sesionTareoService: SesionTareoService) {}

  /**
   * ERR-005: Limpia sesiones abandonadas cada 2 minutos.
   * Una sesión se considera abandonada si no ha enviado heartbeat
   * en los últimos 2 minutos (el frontend envía heartbeat cada 30s).
   */
  @Cron('*/2 * * * *') // Cada 2 minutos
  async limpiarSesionesAbandonadas() {
    try {
      const count = await this.sesionTareoService.limpiarSesionesAbandonadas();

      if (count > 0) {
        this.logger.log(
          `Se marcaron ${count} sesiones de tareo como expiradas por abandono`,
        );
      }
    } catch (error) {
      this.logger.error('Error al limpiar sesiones abandonadas:', error);
    }
  }
}
