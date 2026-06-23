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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ContratosService } from './contratos.service';
import { ContratosExcelService } from './contratos-excel.service';
import { CreateContratoDto, UpdateContratoDto, FilterContratoDto } from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { multerOptions } from '../uploads/uploads.config';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { ContratoParaImportar } from './contratos-excel.service';
import {
  fechaHoyPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contratos')
export class ContratosController {
  constructor(
    private readonly contratosService: ContratosService,
    private readonly contratosExcelService: ContratosExcelService,
  ) {}

  @Get()
  @RequirePermissions('contratos:leer')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filters: FilterContratoDto) {
    return this.contratosService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('contratos:leer')
  getResumen(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.getResumen(user.empresa_id);
  }

  @Get('tipos')
  @RequirePermissions('contratos:leer')
  getTiposContrato(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.getTiposContrato(user.empresa_id);
  }

  @Get('exportar/excel')
  @RequirePermissions('contratos:leer')
  async exportarExcel(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const workbook = await this.contratosExcelService.exportarContratos(
      user.empresa_id,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=contratos_${fechaHoyPeru()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id')
  @RequirePermissions('contratos:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('contratos:crear')
  create(@Body() dto: CreateContratoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.create(user.empresa_id, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('contratos:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContratoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratosService.update(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contratos:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.remove(id, user.empresa_id);
  }

  @Post('reingreso')
  @RequirePermissions('contratos:crear')
  reingreso(@Body() dto: CreateContratoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosService.reingreso(user.empresa_id, dto, user.id);
  }

  @Post(':id/renovar')
  @RequirePermissions('contratos:crear', 'dashboard:editar')
  renovar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContratoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratosService.renovar(id, user.empresa_id, dto, user.id);
  }

  @Patch(':id/terminar')
  @RequirePermissions('contratos:editar', 'dashboard:editar')
  terminar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratosService.terminar(id, user.empresa_id, body.motivo);
  }

  // ==================== IMPORTACIÓN EXCEL ====================

  @Post('importar/preview')
  @RequirePermissions('contratos:crear')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'El archivo debe ser un Excel (.xlsx o .xls)',
      );
    }

    return this.contratosExcelService.previewImport(
      user.empresa_id,
      file.buffer,
    );
  }

  @Post('importar/aplicar')
  @RequirePermissions('contratos:crear')
  async aplicarImport(
    @Body()
    body: {
      contratos: Array<
        Omit<ContratoParaImportar, 'fecha_inicio' | 'fecha_fin' | 'fecha_cese'> & {
          fecha_inicio: string;
          fecha_fin: string;
          fecha_cese?: string | null;
        }
      >;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.contratos || !Array.isArray(body.contratos)) {
      throw new BadRequestException(
        'No se proporcionaron contratos para importar',
      );
    }

    // Convertir strings de fecha a Date usando timezone Peru
    const contratos: ContratoParaImportar[] = body.contratos.map((c) => ({
      ...c,
      fecha_inicio: parsearFechaISOenPeru(c.fecha_inicio),
      fecha_fin: parsearFechaISOenPeru(c.fecha_fin),
      fecha_cese: c.fecha_cese ? parsearFechaISOenPeru(c.fecha_cese) : null,
    }));

    return this.contratosExcelService.aplicarImportacion(
      user.empresa_id,
      user.id,
      contratos,
    );
  }

  // ==================== MANEJO DE ARCHIVOS ====================

  /**
   * Sube un archivo de contrato firmado
   */
  @Post(':id/subir-firmado')
  @RequirePermissions('contratos:editar')
  @UseInterceptors(FileInterceptor('file', multerOptions('contratos')))
  subirContratoFirmado(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    return this.contratosService.subirContratoFirmado(
      id,
      file,
      user.empresa_id,
    );
  }

  /**
   * Descarga el archivo de contrato
   */
  @Get(':id/descargar')
  @RequirePermissions('contratos:leer')
  async descargarContrato(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimetype } =
      await this.contratosService.descargarContrato(id, user.empresa_id);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  /**
   * Elimina el archivo de contrato
   */
  @Delete(':id/archivo')
  @RequirePermissions('contratos:editar')
  eliminarArchivoContrato(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratosService.eliminarArchivoContrato(id, user.empresa_id);
  }
}
