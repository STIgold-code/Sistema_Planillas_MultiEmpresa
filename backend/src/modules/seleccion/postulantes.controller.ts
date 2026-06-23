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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostulantesService } from './postulantes.service';
import {
  CreatePostulanteDto,
  UpdatePostulanteDto,
  FilterPostulanteDto,
  CambiarEstadoPostulanteDto,
  AgregarEvaluacionDto,
  UpdateEvaluacionDto,
  ConvertirEmpleadoDto,
  CreatePostulanteDocumentoDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { MAX_FILE_SIZE } from '../uploads/uploads.config';

@Controller('postulantes')
export class PostulantesController {
  constructor(private readonly postulantesService: PostulantesService) {}

  @Get()
  @RequirePermissions('seleccion:leer')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() filters: FilterPostulanteDto) {
    return this.postulantesService.findAll(user.empresa_id, filters);
  }

  @Get('resumen')
  @RequirePermissions('seleccion:leer')
  getResumen(@CurrentUser() user: AuthenticatedUser) {
    return this.postulantesService.getResumen(user.empresa_id);
  }

  @Get(':id')
  @RequirePermissions('seleccion:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.postulantesService.findOne(id, user.empresa_id);
  }

  @Post()
  @RequirePermissions('seleccion:crear')
  create(@Body() dto: CreatePostulanteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.postulantesService.create(user.empresa_id, dto);
  }

  @Patch(':id')
  @RequirePermissions('seleccion:editar')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostulanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/estado')
  @RequirePermissions('seleccion:editar')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoPostulanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.cambiarEstado(id, user.empresa_id, dto);
  }

  @Get(':id/evaluaciones')
  @RequirePermissions('seleccion:leer')
  getEvaluaciones(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.getEvaluaciones(id, user.empresa_id);
  }

  @Get(':id/evaluaciones/promedio')
  @RequirePermissions('seleccion:leer')
  getPromedioEvaluaciones(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.getPromedioEvaluaciones(id, user.empresa_id);
  }

  @Post(':id/evaluacion')
  @RequirePermissions('seleccion:editar')
  agregarEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgregarEvaluacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.agregarEvaluacion(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Patch(':id/evaluacion/:evaluacionId')
  @RequirePermissions('seleccion:editar')
  actualizarEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('evaluacionId', ParseIntPipe) evaluacionId: number,
    @Body() dto: UpdateEvaluacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.actualizarEvaluacion(
      evaluacionId,
      id,
      user.empresa_id,
      dto,
    );
  }

  @Delete(':id/evaluacion/:evaluacionId')
  @RequirePermissions('seleccion:eliminar')
  eliminarEvaluacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('evaluacionId', ParseIntPipe) evaluacionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.eliminarEvaluacion(
      evaluacionId,
      id,
      user.empresa_id,
    );
  }

  @Post(':id/convertir')
  @RequirePermissions('seleccion:editar', 'empleados:crear')
  convertirAEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertirEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.convertirAEmpleado(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Get(':id/documentos')
  @RequirePermissions('seleccion:leer')
  getDocumentos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.getDocumentos(id, user.empresa_id);
  }

  @Post(':id/documentos')
  @RequirePermissions('seleccion:editar')
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
    @Body() data: CreatePostulanteDocumentoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo');
    }
    return this.postulantesService.createDocumentoConArchivo(
      id,
      user.empresa_id,
      file,
      data,
      user.id,
    );
  }

  @Post(':id/documentos/:documentoId/nueva-version')
  @RequirePermissions('seleccion:editar')
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
    return this.postulantesService.crearNuevaVersionDocumento(
      documentoId,
      id,
      user.empresa_id,
      file,
      motivo.trim(),
      user.id,
    );
  }

  @Get(':id/documentos/:documentoId/historial')
  @RequirePermissions('seleccion:leer')
  getHistorialDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.getHistorialDocumento(
      documentoId,
      id,
      user.empresa_id,
    );
  }

  @Delete(':id/documentos/:documentoId')
  @RequirePermissions('seleccion:eliminar')
  removeDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.postulantesService.deleteDocumento(
      documentoId,
      id,
      user.empresa_id,
      user.id,
      motivo,
    );
  }

  @Delete(':id')
  @RequirePermissions('seleccion:eliminar')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.postulantesService.remove(id, user.empresa_id);
  }
}
