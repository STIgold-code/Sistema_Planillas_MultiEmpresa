import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlantillasUniformeController } from './plantillas-uniforme.controller';
import { PlantillasUniformeService } from './plantillas-uniforme.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlantillasUniformeController],
  providers: [PlantillasUniformeService],
  exports: [PlantillasUniformeService],
})
export class PlantillasUniformeModule {}
