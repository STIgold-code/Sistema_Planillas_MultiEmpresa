import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('proveedores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Post()
  @RequirePermissions('inventarios:configurar')
  create(
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: CreateProveedorDto,
  ) {
    return this.service.create(empresaId, dto);
  }

  @Get()
  @RequirePermissions('inventarios:leer')
  findAll(
    @CurrentUser('empresa_id') empresaId: number,
    @Query('buscar') buscar?: string,
    @Query('activo') activo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(empresaId, {
      buscar,
      activo: activo !== undefined ? activo === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('select')
  @RequirePermissions('inventarios:leer')
  findForSelect(@CurrentUser('empresa_id') empresaId: number) {
    return this.service.findForSelect(empresaId);
  }

  @Get(':id')
  @RequirePermissions('inventarios:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.findOne(id, empresaId);
  }

  @Patch(':id')
  @RequirePermissions('inventarios:configurar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.service.update(id, empresaId, dto);
  }

  @Patch(':id/toggle-activo')
  @RequirePermissions('inventarios:configurar')
  toggleActivo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('empresa_id') empresaId: number,
  ) {
    return this.service.toggleActivo(id, empresaId);
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
