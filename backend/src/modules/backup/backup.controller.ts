import { Controller, Post, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

// El backup vuelca la base COMPLETA (todas las empresas): solo superadmin.
@Controller('backups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('*')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Disparar un backup manual inmediatamente
   */
  @Post('now')
  async triggerBackup() {
    const key = await this.backupService.createFullBackup();
    return {
      success: true,
      message: 'Backup iniciado correctamente',
      path: key,
    };
  }
}
