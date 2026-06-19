import { Module } from '@nestjs/common';
import { BancoDocumentosController } from './banco-documentos.controller';
import { BancoDocumentosService } from './banco-documentos.service';
import { BancoDocumentosGeneracionService } from './banco-documentos-generacion.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [BancoDocumentosController],
  providers: [BancoDocumentosService, BancoDocumentosGeneracionService],
  exports: [BancoDocumentosService, BancoDocumentosGeneracionService],
})
export class BancoDocumentosModule {}
