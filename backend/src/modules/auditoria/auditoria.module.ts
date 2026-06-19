import { Module, Global } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';

@Global() // Hacemos el módulo global para que esté disponible en toda la app
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService], // Exportamos para que otros módulos puedan usarlo
})
export class AuditoriaModule {}
