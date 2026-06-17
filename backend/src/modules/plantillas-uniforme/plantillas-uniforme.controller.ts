import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PlantillasUniformeService } from './plantillas-uniforme.service';
import { PlantillaUniformeDto } from './dto/plantilla-uniforme.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('plantillas-uniforme')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlantillasUniformeController {
  constructor(private readonly service: PlantillasUniformeService) {}

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.findAll(empresaId);
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }

  @Post()
  @RequirePermissions('inventarios:configurar')
  create(
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: PlantillaUniformeDto,
  ) {
    return this.service.create(empresaId, dto);
  }

  @Put(':id')
  @RequirePermissions('inventarios:configurar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: PlantillaUniformeDto,
  ) {
    return this.service.update(id, empresaId, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventarios:configurar')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.remove(id, empresaId);
  }
}
