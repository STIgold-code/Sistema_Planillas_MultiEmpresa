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
   * Dispara un backup manual inmediatamente.
   *
   * Responde solo cuando el backup terminó Y quedó verificado contra el
   * almacenamiento. El tamaño va en la respuesta a propósito: sin él, un
   * backup vacío devolvía exactamente lo mismo que uno bueno y no había forma
   * de distinguir el éxito real del aparente.
   */
  @Post('now')
  async triggerBackup() {
    const { key, bytes, bytesVerificados } =
      await this.backupService.createFullBackup();

    return {
      success: true,
      message: `Backup completado y verificado (${formatearTamanio(bytes)})`,
      path: key,
      bytes,
      bytesVerificados,
      tamanioLegible: formatearTamanio(bytes),
    };
  }
}

/** Formatea bytes en la unidad más legible para un operador. */
function formatearTamanio(bytes: number): string {
  const MB = 1024 * 1024;
  return bytes >= MB
    ? `${(bytes / MB).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}
