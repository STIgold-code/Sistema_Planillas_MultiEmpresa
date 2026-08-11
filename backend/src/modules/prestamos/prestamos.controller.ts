import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TipoPrestamo } from '@prisma/client';
import { ArchivoPrestamo, PrestamosService } from './prestamos.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CancelarPrestamoDto,
  CreatePrestamoDto,
  FilterPrestamoDto,
  UpdatePrestamoDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { PERMISOS } from '../../common/constants/permissions';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../uploads/uploads.config';

/** Un convenio de descuento son 1-2 páginas: el límite por defecto alcanza. */
const PRESTAMO_ARCHIVOS_MAX_COUNT = 5;

const INTERCEPTOR_ARCHIVOS = AnyFilesInterceptor({
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: PRESTAMO_ARCHIVOS_MAX_COUNT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.all.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Tipo de archivo no permitido'), false);
    }
  },
});

@Controller('prestamos')
export class PrestamosController {
  constructor(
    private readonly prestamosService: PrestamosService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISOS.PRESTAMOS.LEER)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: FilterPrestamoDto,
  ) {
    return this.prestamosService.findAll(user.empresa_id, filters);
  }

  @Get(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.LEER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.findOne(id, user.empresa_id);
  }

  /**
   * Alta de préstamo. Es multipart porque el convenio de descuento firmado es
   * OBLIGATORIO: descontar de la remuneración exige autorización escrita del
   * trabajador, así que un préstamo sin respaldo no debe poder registrarse.
   */
  @Post()
  @RequirePermissions(PERMISOS.PRESTAMOS.CREAR)
  @UseInterceptors(INTERCEPTOR_ARCHIVOS)
  async create(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const archivos = await this.subirArchivos(files);
    const dto = this.parsearCreatePrestamo(body);

    return this.prestamosService.create(
      user.empresa_id,
      dto,
      user.id,
      archivos,
    );
  }

  /**
   * Regularización: adjunta el convenio a un préstamo ya registrado. Los
   * préstamos anteriores a esta regla quedaron sin respaldo documental.
   */
  @Post(':id/archivos')
  @RequirePermissions(PERMISOS.PRESTAMOS.EDITAR)
  @UseInterceptors(INTERCEPTOR_ARCHIVOS)
  async agregarArchivos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const archivos = await this.subirArchivos(files);

    return this.prestamosService.agregarArchivos(
      id,
      user.empresa_id,
      user.id,
      archivos,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.EDITAR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrestamoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.update(id, user.empresa_id, dto);
  }

  @Patch(':id/cancelar')
  @RequirePermissions(PERMISOS.PRESTAMOS.EDITAR)
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarPrestamoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.cancelar(id, user.empresa_id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISOS.PRESTAMOS.ELIMINAR)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosService.remove(id, user.empresa_id);
  }

  /** Sube los archivos al storage y los normaliza. Rechaza si no vino ninguno. */
  private async subirArchivos(
    files: Express.Multer.File[] | undefined,
  ): Promise<ArchivoPrestamo[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Debe adjuntar el documento que respalda el préstamo (convenio de descuento firmado por el trabajador)',
      );
    }
    if (files.length > PRESTAMO_ARCHIVOS_MAX_COUNT) {
      throw new BadRequestException(
        `Máximo ${PRESTAMO_ARCHIVOS_MAX_COUNT} archivos por préstamo`,
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

  /**
   * El cuerpo multipart llega como strings: se parsea y valida a mano porque el
   * ValidationPipe global no convierte números ni enums desde `FormData`.
   */
  private parsearCreatePrestamo(
    body: Record<string, string>,
  ): CreatePrestamoDto {
    const empleadoId = Number.parseInt(body.empleado_id, 10);
    if (!Number.isInteger(empleadoId) || empleadoId <= 0) {
      throw new BadRequestException('Debe seleccionar un trabajador válido');
    }

    const tipo = body.tipo as TipoPrestamo;
    if (!Object.values(TipoPrestamo).includes(tipo)) {
      throw new BadRequestException('Tipo de préstamo inválido');
    }

    const cuotaMensual = Number(body.cuota_mensual);
    if (!Number.isFinite(cuotaMensual) || cuotaMensual <= 0) {
      throw new BadRequestException(
        'La cuota mensual debe ser un número mayor a cero',
      );
    }

    const montoTotal =
      body.monto_total === undefined || body.monto_total === ''
        ? undefined
        : Number(body.monto_total);
    if (
      montoTotal !== undefined &&
      (!Number.isFinite(montoTotal) || montoTotal <= 0)
    ) {
      throw new BadRequestException(
        'El monto total debe ser un número mayor a cero',
      );
    }

    if (!body.fecha_otorgado || Number.isNaN(Date.parse(body.fecha_otorgado))) {
      throw new BadRequestException('Fecha de otorgamiento inválida');
    }

    return {
      empleado_id: empleadoId,
      tipo,
      monto_total: montoTotal,
      cuota_mensual: cuotaMensual,
      fecha_otorgado: body.fecha_otorgado,
      observaciones: body.observaciones || undefined,
    };
  }
}
