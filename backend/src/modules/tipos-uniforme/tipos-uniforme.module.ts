import { Module } from '@nestjs/common';
import { TiposUniformeController } from './tipos-uniforme.controller';
import { TiposUniformeService } from './tipos-uniforme.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposUniformeController],
  providers: [TiposUniformeService],
  exports: [TiposUniformeService],
})
export class TiposUniformeModule {}
