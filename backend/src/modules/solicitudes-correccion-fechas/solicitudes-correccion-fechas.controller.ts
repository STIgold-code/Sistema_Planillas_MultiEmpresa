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
import {
  ArchivoSustento,
  SolicitudesCorreccionFechasService,
} from './solicitudes-correccion-fechas.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateSolicitudCorreccionFechaDto,
  FilterSolicitudCorreccionFechaDto,
  ResolverSolicitudCorreccionFechaDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { ALLOWED_MIME_TYPES } from '../uploads/uploads.config';
import { PERMISOS } from '../../common/constants/permissions';

// Mismos límites que cese y anulación
const SUSTENTO_ARCHIVO_MAX_SIZE = 50 * 1024 * 1024; // 50 MB por archivo
const SUSTENTO_ARCHIVOS_MAX_COUNT = 10;

/**
 * Forma cruda del body multipart: todos los campos llegan como cadenas y se
 * parsean a mano antes de armar el DTO (el ValidationPipe global no convierte
 * números desde `FormData`).
 */
interface CrearCorreccionFormData {
  contrato_id: string;
  motivo: string;
  fecha_inicio: string;
  fecha_fin?: string;
}

@Controller('solicitudes-correccion-fechas')
export class SolicitudesCorreccionFechasController {
  constructor(
    private readonly service: SolicitudesCorreccionFechasService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * Alta de la solicitud. Es multipart porque el sustento es OBLIGATORIO:
   * corregir fechas de contrato sin respaldo documental no es auditable.
   */
  @Post()
  @RequirePermissions(PERMISOS.CONTRATOS.EDITAR)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: {
        fileSize: SUSTENTO_ARCHIVO_MAX_SIZE,
        files: SUSTENTO_ARCHIVOS_MAX_COUNT,
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
    @Body() body: CrearCorreccionFormData,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const archivos = await this.subirSustento(files);
    const dto = this.parsearCreate(body);

    return this.service.create(user.empresa_id, dto, user.id, archivos);
  }

  @Get()
  @RequirePermissions(PERMISOS.CONTRATOS.LEER)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterSolicitudCorreccionFechaDto,
  ) {
    return this.service.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions(PERMISOS.CONTRATOS.LEER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresa_id);
  }

  @Patch(':id/aprobar')
  @RequirePermissions(PERMISOS.CONTRATOS.EDICION_APROBAR)
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudCorreccionFechaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.aprobar(id, user.empresa_id, user.id, dto);
  }

  @Patch(':id/rechazar')
  @RequirePermissions(PERMISOS.CONTRATOS.EDICION_APROBAR)
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverSolicitudCorreccionFechaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.rechazar(id, user.empresa_id, user.id, dto);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Sube el sustento al storage y lo normaliza. Rechaza si no vino ninguno. */
  private async subirSustento(
    files: Express.Multer.File[] | undefined,
  ): Promise<ArchivoSustento[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debe adjuntar al menos un documento que sustente la corrección de fechas',
      );
    }
    if (files.length > SUSTENTO_ARCHIVOS_MAX_COUNT) {
      throw new BadRequestException(
        `Máximo ${SUSTENTO_ARCHIVOS_MAX_COUNT} archivos por solicitud`,
      );
    }

    const resultados = await Promise.all(
      files.map((f) => this.uploadsService.processUpload(f, 'documentos')),
    );

    return resultados.map((resultado, indice) => ({
      archivo_url: resultado.file.path,
      archivo_nombre: resultado.file.originalname,
      archivo_tipo: files[indice].mimetype,
      archivo_tamano: files[indice].size,
    }));
  }

  private parsearCreate(
    body: CrearCorreccionFormData,
  ): CreateSolicitudCorreccionFechaDto {
    const contratoId = Number.parseInt(body.contrato_id, 10);
    if (!Number.isInteger(contratoId) || contratoId <= 0) {
      throw new BadRequestException('Debe seleccionar un contrato válido');
    }

    return {
      contrato_id: contratoId,
      motivo: body.motivo ?? '',
      fecha_inicio: body.fecha_inicio ?? '',
      fecha_fin: body.fecha_fin || undefined,
    };
  }
}
