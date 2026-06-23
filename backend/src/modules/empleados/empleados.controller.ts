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
  Res,
  StreamableFile,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EmpleadosService } from './empleados.service';
import {
  CreateEmpleadoDto,
  UpdateEmpleadoDto,
  FilterEmpleadoDto,
  ConsultarSbsDto,
  AddFamiliarDto,
  AddDocumentoDto,
  RegistrarMovimientoDto,
} from './dto';
import { SbsConsultaService } from './services/sbs-consulta.service';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { MAX_FILE_SIZE } from '../uploads/uploads.config';
import { fechaHoyPeru } from '../../common/utils/datetime.util';

@Controller('empleados')
export class EmpleadosController {
  constructor(
    private readonly empleadosService: EmpleadosService,
    private readonly sbsConsultaService: SbsConsultaService,
  ) {}

  @Get()
  @RequirePermissions('empleados:leer')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterEmpleadoDto,
  ) {
    return this.empleadosService.findAll(user.empresa_id, filters);
  }

  @Get('exportar')
  @RequirePermissions('empleados:leer')
  async exportar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterEmpleadoDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const workbook = await this.empleadosService.exportarExcel(
      user.empresa_id,
      filters,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const fecha = fechaHoyPeru();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Empleados_${fecha}.xlsx"`,
    });

    return new StreamableFile(Buffer.from(buffer as ArrayBuffer));
  }

  // ==================== DOCUMENTACIÓN (antes de :id) ====================

  /**
   * Dashboard de cumplimiento de documentación
   */
  @Get('documentacion/dashboard')
  @RequirePermissions('empleados:leer')
  getDashboardDocumentacion(@CurrentUser() user: AuthenticatedUser) {
    return this.empleadosService.getDashboardDocumentacion(user.empresa_id);
  }

  /**
   * Obtiene documentos próximos a vencer
   */
  @Get('documentacion/vencimientos')
  @RequirePermissions('empleados:leer')
  getDocumentosVencimiento(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dias') dias?: string,
  ) {
    const diasAnticipacion = dias ? parseInt(dias, 10) : 30;
    return this.empleadosService.getDocumentosVencimientoProximo(
      user.empresa_id,
      diasAnticipacion,
    );
  }

  /**
   * Recalcula el estado de documentación de todos los empleados
   */
  @Post('documentacion/recalcular')
  @RequirePermissions('empleados:editar')
  recalcularEstadoDocumentacion(@CurrentUser() user: AuthenticatedUser) {
    return this.empleadosService.recalcularEstadoDocumentacionTodos(
      user.empresa_id,
    );
  }

  // ==================== CONSULTA SBS ====================

  /**
   * Consulta la SBS para obtener AFP y CUSPP de un documento
   * Requiere: tipo_documento, numero_documento, apellido_paterno, apellido_materno, nombres
   */
  @Post('consultar-sbs')
  @RequirePermissions('empleados:leer')
  consultarSbs(@Body() dto: ConsultarSbsDto) {
    return this.sbsConsultaService.consultarAfiliacion(
      dto.tipo_documento,
      dto.numero_documento,
      dto.apellido_paterno,
      dto.apellido_materno,
      dto.nombres,
    );
  }

  @Get(':id')
  @RequirePermissions('empleados:leer')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('empleados:crear_directo')
  create(
    @Body() dto: CreateEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // NOTA: Este endpoint requiere permiso especial 'empleados:crear_directo'
    // La forma estándar de crear empleados es mediante el proceso de selección:
    // POST /postulantes/:id/convertir (requiere 'seleccion:editar')
    return this.empleadosService.create(user.empresa_id, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('empleados:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.update(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions('empleados:eliminar')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.remove(id, user.empresa_id);
  }

  // Familiares
  @Post(':id/familiares')
  @RequirePermissions('empleados:editar')
  addFamiliar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddFamiliarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.addFamiliar(id, user.empresa_id, dto);
  }

  @Delete(':id/familiares/:familiarId')
  @RequirePermissions('empleados:editar')
  removeFamiliar(
    @Param('id', ParseIntPipe) id: number,
    @Param('familiarId', ParseIntPipe) familiarId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.removeFamiliar(
      familiarId,
      id,
      user.empresa_id,
    );
  }

  // Documentos
  @Get(':id/documentos')
  @RequirePermissions('empleados:leer')
  getDocumentos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.getDocumentos(id, user.empresa_id);
  }

  @Post(':id/documentos')
  @RequirePermissions('empleados:editar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddDocumentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo');
    }
    return this.empleadosService.createDocumentoConArchivo(
      id,
      user.empresa_id,
      file,
      dto,
      user.id,
    );
  }

  @Post(':id/documentos/:documentoId/nueva-version')
  @RequirePermissions('empleados:editar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async crearNuevaVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('motivo') motivo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo');
    }
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException(
        'Se requiere un motivo para la nueva versión',
      );
    }
    return this.empleadosService.crearNuevaVersionDocumento(
      documentoId,
      id,
      user.empresa_id,
      file,
      motivo.trim(),
      user.id,
    );
  }

  @Get(':id/documentos/:documentoId/historial')
  @RequirePermissions('empleados:leer')
  getHistorialDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.getHistorialDocumento(
      documentoId,
      id,
      user.empresa_id,
    );
  }

  @Delete(':id/documentos/:documentoId')
  @RequirePermissions('empleados:editar')
  removeDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.removeDocumento(
      documentoId,
      id,
      user.empresa_id,
      user,
      motivo,
    );
  }

  // Movimientos
  @Post(':id/movimientos')
  @RequirePermissions('empleados:editar')
  registrarMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarMovimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.registrarMovimiento(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  // Photocheck Log
  @Post(':id/photocheck-log')
  @RequirePermissions('empleados:leer')
  registrarPhotocheckLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { motivo?: string; observaciones?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress =
      req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    return this.empleadosService.registrarPhotocheckLog(
      id,
      user.empresa_id,
      user.id,
      data.motivo || 'NUEVO',
      data.observaciones,
      ipAddress,
    );
  }

  @Get(':id/photocheck-logs')
  @RequirePermissions('empleados:leer')
  getPhotocheckLogs(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.getPhotocheckLogs(id, user.empresa_id);
  }

  /**
   * Actualiza el estado de documentación de un empleado específico
   */
  @Post(':id/documentacion/actualizar-estado')
  @RequirePermissions('empleados:editar')
  actualizarEstadoDocumentacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.actualizarEstadoDocumentacion(
      id,
      user.empresa_id,
    );
  }

  // ==================== EXPEDIENTE DIGITAL UNIFICADO ====================

  /**
   * Obtiene el expediente digital unificado del empleado
   * Combina: Documentos subidos + Documentos generados + Boletas
   */
  @Get(':id/expediente-digital')
  @RequirePermissions('empleados:leer')
  getExpedienteDigital(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('categoria') categoria?: string,
    @Query('origen') origen?: string,
    @Query('anio') anio?: string,
    @Query('buscar') buscar?: string,
  ) {
    return this.empleadosService.getExpedienteDigital(id, user.empresa_id, {
      categoria,
      origen,
      anio: anio ? parseInt(anio) : undefined,
      buscar,
    });
  }

  /**
   * Obtiene la lista de documentos con URLs para descarga masiva
   */
  @Get(':id/expediente-digital/descargar')
  @RequirePermissions('empleados:leer')
  getDocumentosParaDescarga(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.empleadosService.getDocumentosParaDescarga(id, user.empresa_id);
  }
}
