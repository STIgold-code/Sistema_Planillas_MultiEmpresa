import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SucamecService } from './sucamec.service';
import {
  CreateCarnetSucamecDto,
  UpdateCarnetSucamecDto,
  FilterCarnetSucamecDto,
  RenovarCarnetSucamecDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { multerOptions } from '../uploads/uploads.config';

@Controller('sucamec')
export class SucamecController {
  constructor(private readonly sucamecService: SucamecService) {}

  // ==================== LECTURA ====================

  @Get()
  @RequirePermissions('sucamec:leer')
  findAll(@CurrentUser() user: any, @Query() filters: FilterCarnetSucamecDto) {
    return this.sucamecService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('sucamec:leer')
  getResumen(@CurrentUser() user: any) {
    return this.sucamecService.getResumen(user.empresa_id);
  }

  @Get('categorias')
  @RequirePermissions('sucamec:leer')
  getCategorias() {
    return this.sucamecService.getCategorias();
  }

  @Get(':id')
  @RequirePermissions('sucamec:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.sucamecService.findOne(id, user.empresa_id);
  }

  // ==================== ESCRITURA ====================

  @Post()
  @RequirePermissions('sucamec:crear')
  @UseInterceptors(FileInterceptor('file', multerOptions('sucamec')))
  async create(
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: any,
  ) {
    // Parse numeric fields from FormData (comes as strings)
    const parsed: CreateCarnetSucamecDto = {
      empleado_id: parseInt(dto.empleado_id, 10),
      numero_carnet: dto.numero_carnet,
      categoria: dto.categoria,
      fecha_emision: dto.fecha_emision,
      fecha_vencimiento: dto.fecha_vencimiento,
      observaciones: dto.observaciones || undefined,
      documento_id: dto.documento_id
        ? parseInt(dto.documento_id, 10)
        : undefined,
    };

    return this.sucamecService.create(user.empresa_id, parsed, user.id, file);
  }

  @Patch(':id')
  @RequirePermissions('sucamec:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarnetSucamecDto,
    @CurrentUser() user: any,
  ) {
    return this.sucamecService.update(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sucamec:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.sucamecService.remove(id, user.empresa_id);
  }

  // ==================== ACCIONES ESPECIALES ====================

  @Post(':id/renovar')
  @RequirePermissions('sucamec:crear')
  renovar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenovarCarnetSucamecDto,
    @CurrentUser() user: any,
  ) {
    return this.sucamecService.renovar(id, user.empresa_id, dto, user.id);
  }

  @Patch(':id/suspender')
  @RequirePermissions('sucamec:editar')
  suspender(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @CurrentUser() user: any,
  ) {
    if (!body.motivo) {
      throw new BadRequestException(
        'Debe proporcionar un motivo de suspensión',
      );
    }
    return this.sucamecService.suspender(id, user.empresa_id, body.motivo);
  }

  @Patch(':id/anular')
  @RequirePermissions('sucamec:editar')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo: string },
    @CurrentUser() user: any,
  ) {
    if (!body.motivo) {
      throw new BadRequestException('Debe proporcionar un motivo de anulación');
    }
    return this.sucamecService.anular(id, user.empresa_id, body.motivo);
  }

  @Patch(':id/reactivar')
  @RequirePermissions('sucamec:editar')
  reactivar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.sucamecService.reactivar(id, user.empresa_id);
  }

  // ==================== VINCULACIÓN DE DOCUMENTOS ====================

  @Get('empleado/:empleadoId/documentos-sin-vincular')
  @RequirePermissions('sucamec:leer')
  getDocumentosSinVincular(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: any,
  ) {
    return this.sucamecService.getDocumentosSinVincular(
      empleadoId,
      user.empresa_id,
    );
  }

  @Patch(':id/vincular-documento')
  @RequirePermissions('sucamec:editar')
  vincularDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { documento_id: number },
    @CurrentUser() user: any,
  ) {
    if (!body.documento_id) {
      throw new BadRequestException('Debe proporcionar el ID del documento');
    }
    return this.sucamecService.vincularDocumento(
      id,
      user.empresa_id,
      body.documento_id,
    );
  }

  @Patch(':id/desvincular-documento')
  @RequirePermissions('sucamec:editar')
  desvincularDocumento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.sucamecService.desvincularDocumento(id, user.empresa_id);
  }
}
