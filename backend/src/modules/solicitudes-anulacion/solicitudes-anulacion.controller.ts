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
import { SolicitudesAnulacionService } from './solicitudes-anulacion.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateSolicitudAnulacionDto,
  ResolverSolicitudAnulacionDto,
  FilterSolicitudAnulacionDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { ALLOWED_MIME_TYPES } from '../uploads/uploads.config';

// Mismos limites que solicitudes de cese
const ANULACION_ARCHIVO_MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ANULACION_ARCHIVOS_MAX_COUNT = 10;

@Controller('solicitudes-anulacion')
export class SolicitudesAnulacionController {
  constructor(
    private readonly solicitudesAnulacionService: SolicitudesAnulacionService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post()
  @RequirePermissions('contratos:anular_solicitar')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: ANULACION_ARCHIVO_MAX_SIZE,
        files: ANULACION_ARCHIVOS_MAX_COUNT,
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
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debe adjuntar al menos un documento que respalde la anulación',
      );
    }
    if (files.length > ANULACION_ARCHIVOS_MAX_COUNT) {
      throw new BadRequestException(
        `Maximo ${ANULACION_ARCHIVOS_MAX_COUNT} archivos por solicitud`,
      );
    }

    const parsed: CreateSolicitudAnulacionDto = {
      contrato_id: parseInt(dto.contrato_id, 10),
      motivo: dto.motivo,
    };

    const uploadResults = await Promise.all(
      files.map((f) => this.uploadsService.processUpload(f, 'documentos')),
    );
    const archivos = uploadResults.map((r, i) => ({
      archivo_url: r.file.path,
      archivo_nombre: r.file.originalname,
      archivo_tipo: files[i].mimetype,
      archivo_tamano: files[i].size,
    }));

    return this.solicitudesAnulacionService.create(
      user.empresa_id,
      parsed,
      user.id,
      archivos,
    );
  }

  @Get()
  @RequirePermissions('contratos:leer')
  findAll(
    @CurrentUser() user: any,
    @Query() filters: FilterSolicitudAnulacionDto,
  ) {
    return this.solicitudesAnulacionService.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions('contratos:leer')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.solicitudesAnulacionService.findOne(id, user.empresa_id);
  }

  @Patch(':id/aprobar')
  @RequirePermissions('contratos:anular_aprobar', 'dashboard:editar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudAnulacionDto,
    @CurrentUser() user: any,
  ) {
    return this.solicitudesAnulacionService.aprobar(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }

  @Patch(':id/rechazar')
  @RequirePermissions('contratos:anular_aprobar', 'dashboard:editar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudAnulacionDto,
    @CurrentUser() user: any,
  ) {
    return this.solicitudesAnulacionService.rechazar(
      id,
      user.empresa_id,
      user.id,
      dto,
    );
  }
}
