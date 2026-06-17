import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import {
  multerOptions,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
} from './uploads.config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { PERMISO_TOTAL } from '../../common/constants/permissions';
import { AuthenticatedUser } from '../../common/types/auth.types';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Subir un solo archivo
   * POST /api/uploads?categoria=documentos
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      ...multerOptions('temp'),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('categoria') categoria: string = 'temp',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Validar categoría
    if (categoria && !this.uploadsService.validateCategory(categoria)) {
      throw new BadRequestException(
        `Categoría inválida. Disponibles: ${this.uploadsService.getCategories().join(', ')}`,
      );
    }

    const result = await this.uploadsService.processUpload(
      file,
      categoria || 'temp',
      this.opcionesPropiedad(user),
    );

    return {
      ...result,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Construye las opciones de propiedad del archivo a partir del usuario
   * autenticado. La empresa del usuario es el limite de tenant del archivo.
   */
  private opcionesPropiedad(user: AuthenticatedUser) {
    return {
      empresa_id: user.empresa_id,
      subido_por_id: user.id,
    };
  }

  /**
   * Subir archivo para documentos de empleados
   * POST /api/uploads/documentos
   */
  @Post('documentos')
  @UseInterceptors(FileInterceptor('file', multerOptions('documentos')))
  uploadDocumento(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.uploadsService.processUpload(
      file,
      'documentos',
      this.opcionesPropiedad(user),
    );
  }

  /**
   * Subir archivo para evaluaciones de postulantes
   * POST /api/uploads/evaluaciones
   */
  @Post('evaluaciones')
  @UseInterceptors(FileInterceptor('file', multerOptions('evaluaciones')))
  uploadEvaluacion(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.uploadsService.processUpload(
      file,
      'evaluaciones',
      this.opcionesPropiedad(user),
    );
  }

  /**
   * Subir archivo de contrato firmado
   * POST /api/uploads/contratos
   */
  @Post('contratos')
  @UseInterceptors(FileInterceptor('file', multerOptions('contratos')))
  uploadContrato(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.uploadsService.processUpload(
      file,
      'contratos',
      this.opcionesPropiedad(user),
    );
  }

  /**
   * Subir archivo de plantilla de contrato
   * POST /api/uploads/plantillas
   */
  @Post('plantillas')
  @UseInterceptors(FileInterceptor('file', multerOptions('plantillas')))
  uploadPlantilla(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return this.uploadsService.processUpload(
      file,
      'plantillas',
      this.opcionesPropiedad(user),
    );
  }

  /**
   * Subir foto de empleado
   * POST /api/uploads/fotos
   */
  @Post('fotos')
  @UseInterceptors(FileInterceptor('file', multerOptions('empleados')))
  uploadFoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Validar que sea una imagen
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes (JPEG, PNG, WEBP)',
      );
    }

    return this.uploadsService.processUpload(
      file,
      'empleados',
      this.opcionesPropiedad(user),
    );
  }

  /**
   * Subir logo de empresa
   * POST /api/uploads/logos
   */
  @Post('logos')
  @UseInterceptors(FileInterceptor('file', multerOptions('empresas')))
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Validar que sea una imagen
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes (JPEG, PNG, WEBP)',
      );
    }

    // SEGURIDAD: este endpoint sirve tanto para logos (publicos) como para la
    // firma del representante legal (privada, PII legal), ambos subidos por el
    // mismo flujo del frontend. Por eso el archivo se registra como PRIVADO por
    // defecto. El logo se marca como publico recien cuando se confirma su rol
    // al asociarse a Empresa.logo_url (ver companies.service).
    return this.uploadsService.processUpload(file, 'empresas', {
      ...this.opcionesPropiedad(user),
      publico: false,
    });
  }

  /**
   * Subir múltiples archivos
   * POST /api/uploads/multiple?categoria=documentos
   */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions('temp')))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('categoria') categoria: string = 'temp',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    if (categoria && !this.uploadsService.validateCategory(categoria)) {
      throw new BadRequestException(
        `Categoría inválida. Disponibles: ${this.uploadsService.getCategories().join(', ')}`,
      );
    }

    return {
      success: true,
      files: await this.uploadsService.processMultipleUploads(
        files,
        categoria || 'temp',
        this.opcionesPropiedad(user),
      ),
      total: files.length,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Eliminar un archivo
   * DELETE /api/uploads/:categoria/:filename
   * SEGURIDAD: Valida categoria, filename, y permisos para prevenir path traversal e IDOR
   *
   * NOTA: Este endpoint de eliminacion directa solo esta disponible para superadmins.
   * Para usuarios normales, la eliminacion de archivos debe hacerse a traves de los
   * servicios de dominio (empleados, plantillas, etc.) que validan empresa_id.
   */
  @Delete(':categoria/:filename')
  deleteFile(
    @Param('categoria') categoria: string,
    @Param('filename') filename: string,
    @CurrentUser() user: any,
  ) {
    // SEGURIDAD IDOR: Solo superadmins pueden eliminar archivos directamente
    // Los usuarios normales deben eliminar archivos a traves de los endpoints especificos
    // (ej: DELETE /empleados/:id/foto) que validan empresa_id
    const userPermissions: string[] = user.permisos || [];
    const isSuperAdmin = userPermissions.includes(PERMISO_TOTAL);

    if (!isSuperAdmin) {
      this.logger.warn(
        `[SECURITY] User ${user.id} attempted direct file deletion without admin permissions: ${categoria}/${filename}`,
      );
      throw new ForbiddenException(
        'No tiene permisos para eliminar archivos directamente. Use el endpoint del modulo correspondiente.',
      );
    }

    // SEGURIDAD: Validar que la categoria sea una de las permitidas
    if (!this.uploadsService.validateCategory(categoria)) {
      throw new BadRequestException(
        `Categoria invalida. Permitidas: ${this.uploadsService.getCategories().join(', ')}`,
      );
    }

    // SEGURIDAD: Validar que el filename no contenga caracteres peligrosos
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Nombre de archivo invalido');
    }

    this.logger.log(
      `[ADMIN] User ${user.id} deleting file: ${categoria}/${filename}`,
    );
    const relativePath = `${categoria}/${filename}`;
    return this.uploadsService.deleteFile(relativePath);
  }

  /**
   * Obtener informacion de un archivo
   * GET /api/uploads/info/:categoria/:filename
   * SEGURIDAD: Valida categoria y filename para prevenir path traversal
   */
  @Get('info/:categoria/:filename')
  getFileInfo(
    @Param('categoria') categoria: string,
    @Param('filename') filename: string,
  ) {
    // SEGURIDAD: Validar que la categoria sea una de las permitidas
    if (!this.uploadsService.validateCategory(categoria)) {
      throw new BadRequestException(
        `Categoria invalida. Permitidas: ${this.uploadsService.getCategories().join(', ')}`,
      );
    }

    // SEGURIDAD: Validar que el filename no contenga caracteres peligrosos
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Nombre de archivo invalido');
    }

    const relativePath = `${categoria}/${filename}`;
    const info = this.uploadsService.getFileInfo(relativePath);

    if (!info.exists) {
      throw new BadRequestException('Archivo no encontrado');
    }

    return {
      ...info,
      url: `/uploads/${relativePath}`,
      sizeFormatted: this.uploadsService.formatFileSize(info.size || 0),
    };
  }

  /**
   * Obtener categorías disponibles
   * GET /api/uploads/categories
   */
  @Get('categories')
  getCategories() {
    return {
      categories: this.uploadsService.getCategories(),
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeFormatted: this.uploadsService.formatFileSize(MAX_FILE_SIZE),
      allowedExtensions: ALLOWED_EXTENSIONS,
    };
  }
}
