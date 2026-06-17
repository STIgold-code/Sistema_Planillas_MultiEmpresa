import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class AuthTasksService {
  private readonly logger = new Logger(AuthTasksService.name);

  constructor(private authService: AuthService) {}

  /**
   * Limpia tokens revocados expirados cada día a las 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    this.logger.log('Limpiando tokens revocados expirados...');

    try {
      const count = await this.authService.cleanupExpiredTokens();
      if (count > 0) {
        this.logger.log(`Se eliminaron ${count} tokens revocados expirados`);
      } else {
        this.logger.log('No hay tokens expirados para limpiar');
      }
    } catch (error) {
      this.logger.error('Error al limpiar tokens expirados:', error);
    }
  }
}
