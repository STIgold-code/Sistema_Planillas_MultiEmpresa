import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { existsSync, createReadStream, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { UploadsService } from './uploads.service';
import { UPLOADS_DIR } from './uploads.config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public, CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/types/auth.types';
import type { Archivo } from '@prisma/client';
import * as mime from 'mime-types';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Valida la key para prevenir path traversal
   */
  private validateKey(encodedKey: string): string {
    if (!encodedKey || typeof encodedKey !== 'string') {
      throw new BadRequestException('Key de archivo invalida');
    }

    const key = decodeURIComponent(encodedKey);

    // SEGURIDAD: Detectar patrones de path traversal
    const dangerousPatterns = [
      /\.\./, // ../
      /\.\.\\/, // ..\
      /^[/\\]/, // Rutas absolutas
      /^[a-zA-Z]:/, // Rutas Windows absolutas
      /%2e%2e/i, // URL encoded .. (doble encoding)
      /\0/, // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(key)) {
        throw new BadRequestException('Key de archivo no permitida');
      }
    }

    return key;
  }

  /**
   * SEGURIDAD: autoriza el acceso a un archivo segun su registro de propiedad.
   *
   * - Si no existe registro `Archivo` para la key => 404 (no se filtra existencia).
   * - Si es publico => acceso permitido.
   * - Si es privado => exige que pertenezca a la empresa del usuario; si no,
   *   404 generico (no 403) para no revelar que el archivo existe en otra empresa.
   *
   * @returns el registro `Archivo` autorizado.
   */
  private async authorizeArchivo(
    key: string,
    user: AuthenticatedUser,
  ): Promise<Archivo> {
    const archivo = await this.uploadsService.getArchivoByKey(key);

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (archivo.publico) {
      return archivo;
    }

    if (archivo.empresa_id !== user.empresa_id) {
      this.logger.warn(
        `[SECURITY] IDOR bloqueado: usuario ${user.id} (empresa ${user.empresa_id}) intento acceder a archivo ${key} de empresa ${archivo.empresa_id}`,
      );
      // 404 generico: no revelar que el archivo existe en otra empresa.
      throw new NotFoundException('Archivo no encontrado');
    }

    return archivo;
  }

  /**
   * Sirve el archivo al cliente desde Wasabi.
   * @param publico controla la directiva de cache: los privados NUNCA usan
   *        cache compartido/publico para no exponer PII en proxies/CDN.
   */
  private async streamFile(key: string, res: Response, publico: boolean) {
    const fileData = await this.uploadsService.getFileFromWasabi(key);

    if (!fileData) {
      throw new NotFoundException('Archivo no encontrado');
    }

    res.set({
      'Content-Type': fileData.contentType,
      'Content-Length': fileData.contentLength,
      'Cache-Control': publico ? 'public, max-age=86400' : 'private, no-store',
      // CORS: Permitir que el recurso sea accedido cross-origin
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
    });

    fileData.body.pipe(res);
  }

  /**
   * GET /api/files/public/:key
   * Endpoint PUBLICO. Solo sirve archivos cuyo registro `Archivo` esta marcado
   * como publico (logos, assets). Ya NO depende de prefijos: las firmas y
   * documentos quedan fuera aunque compartan carpeta con los logos.
   */
  @Public()
  @Get('public/:key')
  async servePublicFile(
    @Param('key') encodedKey: string,
    @Res() res: Response,
  ) {
    const key = this.validateKey(encodedKey);

    const archivo = await this.uploadsService.getArchivoByKey(key);
    if (!archivo || !archivo.publico) {
      // Generico: no revelar si la key existe pero es privada.
      throw new NotFoundException('Archivo no encontrado');
    }

    return this.streamFile(key, res, true);
  }

  /**
   * GET /api/files/key/:key
   * Endpoint PROTEGIDO para documentos sensibles (Wasabi).
   * Requiere autenticacion JWT y valida propiedad por empresa (anti-IDOR).
   */
  @Get('key/:key')
  async serveFile(
    @Param('key') encodedKey: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const key = this.validateKey(encodedKey);
    const archivo = await this.authorizeArchivo(key, user);
    return this.streamFile(key, res, archivo.publico);
  }

  /**
   * Valida path para archivos locales (previene path traversal)
   */
  private validateLocalPath(encodedKey: string): string {
    if (!encodedKey || typeof encodedKey !== 'string') {
      throw new BadRequestException('Key de archivo invalida');
    }

    const key = decodeURIComponent(encodedKey);

    // SEGURIDAD: Detectar patrones de path traversal
    const dangerousPatterns = [
      /\.\./, // ../
      /\.\.\\/, // ..\
      /^[/\\]/, // Rutas absolutas
      /^[a-zA-Z]:/, // Rutas Windows absolutas
      /%2e%2e/i, // URL encoded ..
      /\0/, // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(key)) {
        this.logger.warn(
          `[SECURITY] Path traversal attempt in local file: ${key}`,
        );
        throw new ForbiddenException(
          'Acceso denegado: ruta de archivo no permitida',
        );
      }
    }

    // Resolver y verificar que está dentro del directorio de uploads
    const fullPath = resolve(join(UPLOADS_DIR, key));
    const uploadsBase = resolve(UPLOADS_DIR);

    if (
      !fullPath.startsWith(uploadsBase + '\\') &&
      !fullPath.startsWith(uploadsBase + '/')
    ) {
      this.logger.warn(
        `[SECURITY] Path escape attempt: ${key} resolved to ${fullPath}`,
      );
      throw new ForbiddenException(
        'Acceso denegado: archivo fuera del directorio permitido',
      );
    }

    return fullPath;
  }

  /**
   * Sirve un archivo local ya validado al cliente.
   */
  private streamLocalFile(fullPath: string, res: Response, publico: boolean) {
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const stats = statSync(fullPath);
    const extension = extname(fullPath);
    const contentType = mime.lookup(extension) || 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': publico ? 'public, max-age=86400' : 'private, no-store',
      // CORS: Permitir que el recurso sea accedido cross-origin
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
    });

    const stream = createReadStream(fullPath);
    stream.pipe(res);
  }

  /**
   * GET /api/files/local/:key
   * Endpoint PROTEGIDO para archivos locales.
   * Requiere autenticacion JWT y valida propiedad por empresa (anti-IDOR).
   */
  @Get('local/:key')
  async serveLocalFile(
    @Param('key') encodedKey: string,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const key = this.validateKey(encodedKey);
    const archivo = await this.authorizeArchivo(key, user);
    const fullPath = this.validateLocalPath(encodedKey);
    return this.streamLocalFile(fullPath, res, archivo.publico);
  }

  /**
   * GET /api/files/local/public/:key
   * Endpoint PUBLICO para archivos locales. Solo sirve si el registro `Archivo`
   * esta marcado como publico (no depende de prefijos).
   */
  @Public()
  @Get('local/public/:key')
  async serveLocalPublicFile(
    @Param('key') encodedKey: string,
    @Res() res: Response,
  ) {
    const key = this.validateKey(encodedKey);

    const archivo = await this.uploadsService.getArchivoByKey(key);
    if (!archivo || !archivo.publico) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const fullPath = this.validateLocalPath(encodedKey);
    return this.streamLocalFile(fullPath, res, true);
  }
}
