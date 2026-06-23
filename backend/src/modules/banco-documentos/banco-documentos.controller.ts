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
  ParseBoolPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { BancoDocumentosService } from './banco-documentos.service';
import {
  CreatePlantillaDocumentoDto,
  UpdatePlantillaDocumentoDto,
  GenerarDocumentoDto,
  ActualizarEstadoDocumentoDto,
  GenerarMasivoDto,
  CategoriaDocumento,
} from './dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { multerOptions } from '../uploads/uploads.config';
import { lookup } from 'mime-types';

@Controller('banco-documentos')
export class BancoDocumentosController {
  constructor(
    private readonly bancoDocumentosService: BancoDocumentosService,
  ) {}

  // ==================== PLANTILLAS ====================

  @Get('plantillas')
  @RequirePermissions('maestros:leer')
  findAllPlantillas(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.bancoDocumentosService.findAllPlantillas(
      user.empresa_id,
      includeInactive,
    );
  }

  @Get('plantillas/variables')
  @RequirePermissions('maestros:leer')
  getVariablesDisponibles() {
    return this.bancoDocumentosService.getVariablesDisponibles();
  }

  @Get('plantillas/:id')
  @RequirePermissions('maestros:leer')
  findOnePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.findOnePlantilla(id, user.empresa_id);
  }

  @Post('plantillas')
  @RequirePermissions('maestros:crear')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas_banco')))
  createPlantilla(
    @Body() dto: CreatePlantillaDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.createPlantilla(
      dto,
      file,
      user.empresa_id,
    );
  }

  @Post('extract-variables')
  @RequirePermissions('maestros:crear')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas_banco')))
  extractVariables(@UploadedFile() file: Express.Multer.File) {
    return this.bancoDocumentosService.extractVariables(file);
  }

  @Patch('plantillas/:id')
  @RequirePermissions('maestros:editar')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas_banco')))
  updatePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantillaDocumentoDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.updatePlantilla(
      id,
      dto,
      file,
      user.empresa_id,
    );
  }

  @Delete('plantillas/:id')
  @RequirePermissions('maestros:eliminar')
  removePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.removePlantilla(id, user.empresa_id);
  }

  @Patch('plantillas/:id/toggle')
  @RequirePermissions('maestros:editar')
  togglePlantilla(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.togglePlantilla(id, user.empresa_id);
  }

  // ==================== DOCUMENTOS GENERADOS ====================

  @Post('generar')
  @RequirePermissions('empleados:editar')
  async generarDocumento(
    @Body() dto: GenerarDocumentoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.bancoDocumentosService.generarDocumento(
      dto,
      user.empresa_id,
      user.id,
    );

    // Configurar headers para descarga de archivo
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length);

    // Enviar el buffer
    res.send(result.buffer);
  }

  @Post('generar-masivo')
  @RequirePermissions('empleados:editar')
  generarDocumentosMasivo(
    @Body() dto: GenerarMasivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.generarDocumentosMasivo(
      dto,
      user.empresa_id,
      user.id,
    );
  }

  @Get('empleado/:empleadoId/contenidos-pdf')
  @RequirePermissions('empleados:leer')
  getContenidosPdfEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @Query('categoria') categoria: CategoriaDocumento | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.getContenidosPdfEmpleado(
      empleadoId,
      user.empresa_id,
      categoria,
    );
  }

  @Get('empleado/:empleadoId')
  @RequirePermissions('empleados:leer')
  findDocumentosEmpleado(
    @Param('empleadoId', ParseIntPipe) empleadoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.findDocumentosEmpleado(
      empleadoId,
      user.empresa_id,
    );
  }

  @Get('documento/:id')
  @RequirePermissions('empleados:leer')
  findOneDocumento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.findOneDocumento(id, user.empresa_id);
  }

  @Patch('documento/:id/estado')
  @RequirePermissions('empleados:editar')
  actualizarEstadoDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoDocumentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.actualizarEstadoDocumento(
      id,
      dto,
      user.empresa_id,
      user.id,
    );
  }

  @Delete('documento/:id')
  @RequirePermissions('empleados:editar')
  eliminarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.eliminarDocumento(id, user.empresa_id);
  }

  @Get('documento/:id/descargar')
  @RequirePermissions('empleados:leer')
  async descargarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    // Obtener información del documento
    const { fileKey, downloadName } =
      await this.bancoDocumentosService.getDocumentoParaDescarga(
        id,
        user.empresa_id,
      );

    // Determinar content-type basado en la extensión
    const contentType = lookup(fileKey) || 'application/octet-stream';

    // Configurar headers para descarga
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'private, max-age=0',
    });

    try {
      // Verificar si usa Wasabi o almacenamiento local
      if (this.bancoDocumentosService.isUsingWasabi()) {
        // Obtener stream de Wasabi
        const fileData =
          await this.bancoDocumentosService.getFileStreamWasabi(fileKey);

        if (!fileData) {
          throw new NotFoundException('Archivo no encontrado en el servidor');
        }

        res.set('Content-Length', fileData.contentLength.toString());
        fileData.body.pipe(res);
      } else {
        // Obtener archivo local
        const filePath = this.bancoDocumentosService.getLocalFilePath(fileKey);

        if (!this.bancoDocumentosService.localFileExists(filePath)) {
          throw new NotFoundException('Archivo no encontrado en el servidor');
        }

        const fileStream =
          this.bancoDocumentosService.createLocalReadStream(filePath);

        // Manejar errores del stream
        fileStream.on('error', () => {
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error al leer el archivo' });
          }
        });

        fileStream.pipe(res);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Error al acceder al archivo');
    }
  }

  @Post('documento/:id/subir-firmado')
  @RequirePermissions('empleados:editar')
  @UseInterceptors(FileInterceptor('file', multerOptions('documentos')))
  subirDocumentoFirmado(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bancoDocumentosService.subirDocumentoFirmado(
      id,
      file,
      user.empresa_id,
    );
  }

  // ==================== REPORTES ====================

  @Get('reporte/pendientes')
  @RequirePermissions('empleados:leer')
  getDocumentosPendientes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.bancoDocumentosService.getDocumentosPendientesPorEmpleado(
      user.empresa_id,
      page || 1,
      limit || 50,
    );
  }
}
