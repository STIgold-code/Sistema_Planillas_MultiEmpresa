import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  getMyCompany(@CurrentUser() user: any) {
    return this.companiesService.findOne(user.empresa_id);
  }

  @Get()
  @RequirePermissions('empresas:leer')
  findAll(@CurrentUser() user: any) {
    // Solo usuarios con permiso wildcard pueden ver todas las empresas
    if (user.rol?.permisos?.includes('*')) {
      return this.companiesService.findAll();
    }
    // Usuarios normales solo ven su empresa
    return this.companiesService.findOne(user.empresa_id).then((e) => [e]);
  }

  @Get(':id')
  @RequirePermissions('empresas:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    // Validar que solo acceda a su propia empresa (o tiene permiso *)
    if (id !== user.empresa_id && !user.rol?.permisos?.includes('*')) {
      throw new ForbiddenException('No puede acceder a otra empresa');
    }
    return this.companiesService.findOne(id);
  }

  @Post()
  @RequirePermissions('empresas:crear')
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id')
  @RequirePermissions('empresas:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    // Validar que solo modifique su propia empresa (o tiene permiso *)
    if (id !== user.empresa_id && !user.rol?.permisos?.includes('*')) {
      throw new ForbiddenException('No puede modificar otra empresa');
    }
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @RequirePermissions('empresas:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    // Validar que solo elimine su propia empresa (o tiene permiso *)
    if (id !== user.empresa_id && !user.rol?.permisos?.includes('*')) {
      throw new ForbiddenException('No puede eliminar otra empresa');
    }
    return this.companiesService.remove(id);
  }
}
