import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SolicitudesCeseService } from './solicitudes-cese.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateSolicitudCeseDto,
  ResolverSolicitudCeseDto,
  FilterSolicitudCeseDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { ALLOWED_MIME_TYPES } from '../uploads/uploads.config';

// Limites especificos para solicitudes de cese (mas amplios que el default 10MB)
const CESE_ARCHIVO_MAX_SIZE = 50 * 1024 * 1024; // 50 MB por archivo
const CESE_ARCHIVOS_MAX_COUNT = 10;

@Controller('solicitudes-cese')
export class SolicitudesCeseController {
  constructor(
    private readonly solicitudesCeseService: SolicitudesCeseService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post()
  @RequirePermissions('ceses:solicitar')
  @UseInterceptors(
    // AnyFilesInterceptor acepta cualquier nombre de campo (file/files/files[]).
    // Esto mantiene compatibilidad con el frontend viejo (que manda 'file')
    // y soporta el frontend nuevo multi-upload (que mandara 'files').
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: CESE_ARCHIVO_MAX_SIZE,
        files: CESE_ARCHIVOS_MAX_COUNT,
      },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.all.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async create(
    @Body() dto: any,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: any,
  ) {
    // Validacion: al menos 1 archivo obligatorio
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debe adjuntar al menos un documento que respalde el cese',
      );
    }
    if (files.length > CESE_ARCHIVOS_MAX_COUNT) {
      throw new BadRequestException(
        `Maximo ${CESE_ARCHIVOS_MAX_COUNT} archivos por solicitud`,
      );
    }

    // Parse numeric fields from FormData (comes as strings)
    const parsed: CreateSolicitudCeseDto = {
      empleado_id: parseInt(dto.empleado_id, 10),
      tipo_cese_id: parseInt(dto.tipo_cese_id, 10),
      motivo: dto.motivo || undefined,
      fecha_efectiva: dto.fecha_efectiva,
    };

    // Subir todos los archivos en paralelo
    const uploadResults = await Promise.all(
      files.map((f) => this.uploadsService.processUpload(f, 'documentos')),
    );
    const archivos = uploadResults.map((r, i) => ({
      archivo_url: r.file.path,
      archivo_nombre: r.file.originalname,
      archivo_tipo: files[i].mimetype,
      archivo_tamano: files[i].size,
    }));

    return this.solicitudesCeseService.create(
      user.empresa_id,
      parsed,
      user.id,
      archivos,
    );
  }

  @Get()
  @RequirePermissions('ceses:leer')
  findAll(@CurrentUser() user: any, @Query() filters: FilterSolicitudCeseDto) {
    return this.solicitudesCeseService.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions('ceses:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.solicitudesCeseService.findOne(id, user.empresa_id);
  }

  @Patch(':id/aprobar')
  @RequirePermissions('ceses:aprobar', 'dashboard:editar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudCeseDto,
    @CurrentUser() user: any,
  ) {
    return this.solicitudesCeseService.aprobar(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Patch(':id/rechazar')
  @RequirePermissions('ceses:aprobar', 'dashboard:editar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudCeseDto,
    @CurrentUser() user: any,
  ) {
    return this.solicitudesCeseService.rechazar(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }
}
