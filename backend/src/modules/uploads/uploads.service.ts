import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  existsSync,
  unlinkSync,
  statSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { join, extname, dirname, basename, resolve, normalize } from 'path';
import { Readable } from 'stream';
import {
  UPLOADS_DIR,
  UPLOAD_PATHS,
  ensureUploadDirs,
  validateAndSecureFile,
  validateAndSecureBuffer,
} from './uploads.config';
import { v4 as uuidv4 } from 'uuid';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client, bucketName, useWasabi } from '../../config/wasabi.config';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { esCategoriaPublica } from './archivo.constants';
import { extraerKeyDeValor } from './archivo-key.util';
import type { Archivo } from '@prisma/client';

export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

export interface UploadResult {
  success: boolean;
  file: UploadedFile;
  message: string;
}

/**
 * Opciones de propiedad al procesar un upload. Si `empresa_id`/`subido_por_id`
 * no se pasan explicitamente, se resuelven desde el contexto del request
 * autenticado (RequestContextService).
 */
export interface ProcessUploadOptions {
  empresa_id?: number;
  subido_por_id?: number | null;
  /** Forzar visibilidad. Si se omite, se deriva de la categoria. */
  publico?: boolean;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly prisma: PrismaService) {
    // Asegurar que existan los directorios al iniciar
    ensureUploadDirs();
    this.logger.log(
      `[UploadsService] Constructor. UseWasabi: ${useWasabi}, S3Client: ${!!s3Client}`,
    );
    this.logger.log(`[UploadsService] Bucket: ${bucketName}`);
  }

  /**
   * Valida el contenido de un archivo (Magic Bytes)
   */
  validateFileContent(filePath: string, mimetype: string): void {
    validateAndSecureFile(filePath, mimetype);
  }

  // --- METODOS DE SEGURIDAD (Path Traversal Prevention) ---

  /**
   * Valida que una ruta relativa no contenga secuencias de path traversal
   * y que la ruta resuelta este dentro del directorio de uploads permitido.
   * @param relativePath - Ruta relativa a validar
   * @returns La ruta completa validada
   * @throws ForbiddenException si la ruta es invalida o intenta escapar del directorio
   */
  private validateAndResolvePath(relativePath: string): string {
    // 1. Verificar que no este vacio
    if (!relativePath || typeof relativePath !== 'string') {
      throw new BadRequestException('Ruta de archivo invalida');
    }

    // 2. Normalizar la ruta para detectar secuencias como ../ o ..\
    const normalizedInput = normalize(relativePath);

    // 3. Detectar patrones de path traversal ANTES de resolver
    const dangerousPatterns = [
      /\.\./, // ../
      /\.\.\\/, // ..\
      /^[/\\]/, // Rutas absolutas
      /^[a-zA-Z]:/, // Rutas Windows absolutas (C:, D:, etc.)
      /%2e%2e/i, // URL encoded ..
      /%252e/i, // Double URL encoded .
      /\0/, // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(relativePath) || pattern.test(normalizedInput)) {
        this.logger.warn(
          `[SECURITY] Path traversal attempt detected: ${relativePath}`,
        );
        throw new ForbiddenException(
          'Acceso denegado: ruta de archivo no permitida',
        );
      }
    }

    // 4. Resolver la ruta completa
    const fullPath = resolve(UPLOADS_DIR, normalizedInput);

    // 5. Verificar que la ruta resuelta este DENTRO del directorio de uploads
    const uploadsBase = resolve(UPLOADS_DIR);
    if (
      !fullPath.startsWith(uploadsBase + '\\') &&
      !fullPath.startsWith(uploadsBase + '/') &&
      fullPath !== uploadsBase
    ) {
      this.logger.warn(
        `[SECURITY] Path escape attempt: ${relativePath} resolved to ${fullPath}`,
      );
      throw new ForbiddenException(
        'Acceso denegado: ruta de archivo fuera del directorio permitido',
      );
    }

    return fullPath;
  }

  /**
   * Valida una key para Wasabi S3 (sin path traversal)
   * @param key - Key a validar
   * @returns La key sanitizada
   */
  private validateS3Key(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Key de archivo invalida');
    }

    // Normalizar y limpiar la key PRIMERO (quitar slashes iniciales)
    const normalizedKey = key.replace(/\\/g, '/').replace(/^\/+/, '');

    // Detectar patrones peligrosos en keys de S3
    const dangerousPatterns = [
      /\.\./, // ../
      /\.\.\\/, // ..\
      /^[a-zA-Z]:/, // Rutas Windows absolutas
      /%2e%2e/i, // URL encoded ..
      /\0/, // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedKey)) {
        this.logger.warn(`[SECURITY] S3 key traversal attempt: ${key}`);
        throw new ForbiddenException(
          'Acceso denegado: key de archivo no permitida',
        );
      }
    }

    return normalizedKey;
  }

  // --- METODOS HIBRIDOS (WASABI / LOCAL) ---

  /**
   * Genera un nombre de archivo único con timestamp
   */
  generateFilename(prefix: string, originalname: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = extname(originalname).toLowerCase();
    const name = basename(originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    return `${prefix}_${name}_${timestamp}${ext}`;
  }

  /**
   * Genera la key/path para el archivo
   * Estructura: carpeta/id/archivo.ext
   */
  generateKey(folder: string, id: string | number, filename: string): string {
    return `${folder}/${id}/${filename}`;
  }

  /**
   * Sube un archivo usando Streams (eficiente para archivos grandes como backups)
   */
  async uploadStream(
    stream: Readable,
    key: string,
    mimetype: string,
  ): Promise<string> {
    if (useWasabi && s3Client) {
      // Usar @aws-sdk/lib-storage para subir streams sin saber el tamaño
      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: stream,
          ContentType: mimetype,
        },
        // Opcional: configurar tamaño de partes
        partSize: 1024 * 1024 * 5, // 5MB
        leavePartsOnError: false,
      });

      await parallelUploads3.done();

      this.logger.log(`Stream subido a Wasabi: ${key}`);
      return key;
    } else {
      // Implementación local para Streams
      const filePath = join(UPLOADS_DIR, key);
      const dir = dirname(filePath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const writeStream = require('fs').createWriteStream(filePath);
      return new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => {
          this.logger.log(`Stream guardado localmente: ${key}`);
          resolve(key);
        });
        writeStream.on('error', (err) => {
          this.logger.error(`Error guardando stream local: ${err.message}`);
          reject(err);
        });
      });
    }
  }

  /**
   * Sube un archivo al almacenamiento (local o Wasabi)
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimetype: string,
  ): Promise<string> {
    if (useWasabi && s3Client) {
      // Subir a Wasabi S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
      this.logger.log(`Archivo subido a Wasabi: ${key}`);
      return key;
    } else {
      // Guardar localmente usando la estructura de carpetas nueva
      const filePath = join(UPLOADS_DIR, key);
      const dir = dirname(filePath);

      // Crear subdirectorios si no existen
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(filePath, buffer);
      this.logger.log(`Archivo guardado localmente: ${key}`);
      return key;
    }
  }

  /**
   * Elimina un archivo del almacenamiento (Hibrido)
   * SEGURIDAD: Valida path traversal antes de eliminar
   */
  async deleteFileHybrid(key: string): Promise<boolean> {
    try {
      if (useWasabi && s3Client) {
        // Validar key para S3
        const sanitizedKey = this.validateS3Key(key);
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: sanitizedKey,
          }),
        );
        this.logger.log(`Archivo eliminado de Wasabi: ${sanitizedKey}`);
      } else {
        // Validar y resolver path local de forma segura
        const filePath = this.validateAndResolvePath(key);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
          this.logger.log(`Archivo eliminado localmente: ${key}`);
        }
      }
      return true;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error eliminando archivo: ${mensaje}`);
      return false;
    }
  }

  /**
   * Genera la URL del archivo según el entorno
   * SEGURIDAD: Los archivos se sirven a través de endpoints autenticados
   */
  getFileUrl(key: string): string {
    // Guard: desenredar URLs corruptas almacenadas en BD y extraer la key real.
    // Si es una URL externa no mapeable, devolverla tal cual.
    const key_clean = extraerKeyDeValor(key) ?? key;

    let baseUrl = process.env.BACKEND_URL || 'http://localhost:4001';

    // Eliminar slash final si existe
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const apiPrefix = baseUrl.endsWith('/api') ? '' : '/api';

    if (useWasabi) {
      // URL del proxy para Wasabi (endpoint protegido)
      return `${baseUrl}${apiPrefix}/files/key/${encodeURIComponent(key_clean)}`;
    } else {
      // URL para archivos locales (endpoint protegido)
      // SEGURIDAD: Ya no usamos /uploads/ que era público sin autenticación
      return `${baseUrl}${apiPrefix}/files/local/${encodeURIComponent(key_clean)}`;
    }
  }

  /**
   * Genera la URL pública del archivo (solo para logos, assets, etc.)
   */
  getPublicFileUrl(key: string): string {
    let baseUrl = process.env.BACKEND_URL || 'http://localhost:4001';

    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const apiPrefix = baseUrl.endsWith('/api') ? '' : '/api';

    if (useWasabi) {
      return `${baseUrl}${apiPrefix}/files/public/${encodeURIComponent(key)}`;
    } else {
      return `${baseUrl}${apiPrefix}/files/local/public/${encodeURIComponent(key)}`;
    }
  }

  /**
   * Obtiene un archivo de Wasabi (para el proxy)
   * SEGURIDAD: Valida key contra path traversal
   */
  async getFileFromWasabi(key: string): Promise<{
    body: NodeJS.ReadableStream;
    contentType: string;
    contentLength: number;
  } | null> {
    if (!useWasabi || !s3Client) {
      return null;
    }

    // Validar key para S3
    const sanitizedKey = this.validateS3Key(key);

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: sanitizedKey,
        }),
      );

      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: sanitizedKey,
        }),
      );

      const body = response.Body;
      if (!body) {
        return null;
      }

      // AWS SDK v3: convertir a Node.js stream compatible
      let nodeStream: NodeJS.ReadableStream;
      const bodyDesconocido = body as unknown as {
        pipe?: unknown;
        getReader?: () => ReadableStreamDefaultReader<Uint8Array>;
      };

      if (typeof bodyDesconocido.pipe === 'function') {
        // Ya es un Node.js stream
        nodeStream = body as NodeJS.ReadableStream;
      } else if (typeof bodyDesconocido.getReader === 'function') {
        // Es un Web ReadableStream, convertir a Node.js Readable
        const reader = bodyDesconocido.getReader();
        nodeStream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            } catch (err) {
              this.destroy(err as Error);
            }
          },
        });
      } else {
        // Fallback: leer todo a buffer y crear stream
        const buffer = await this.getFileBuffer(key);
        nodeStream = Readable.from(buffer);
      }

      return {
        body: nodeStream,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength || 0,
      };
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error obteniendo archivo de Wasabi: ${mensaje}`);
      return null;
    }
  }

  /**
   * Obtiene el contenido de un archivo como Buffer (Wasabi o Local)
   * SEGURIDAD: Valida path traversal antes de leer
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    if (useWasabi && s3Client) {
      // Validar key para S3
      const sanitizedKey = this.validateS3Key(key);
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: sanitizedKey,
          }),
        );

        // AWS SDK v3: usar transformToByteArray() para convertir a Buffer
        // Esto funciona tanto con Node.js streams como con Web Streams API
        const body = response.Body;
        if (!body) {
          throw new Error('Response body is empty');
        }

        // Método compatible con AWS SDK v3 en todos los entornos
        const bodyDesconocido = body as unknown as {
          transformToByteArray?: () => Promise<Uint8Array>;
          on?: unknown;
          getReader?: () => ReadableStreamDefaultReader<Uint8Array>;
        };
        if (typeof bodyDesconocido.transformToByteArray === 'function') {
          // Método moderno de AWS SDK v3
          const byteArray = await bodyDesconocido.transformToByteArray();
          return Buffer.from(byteArray);
        } else if (typeof bodyDesconocido.on === 'function') {
          // Fallback para Node.js streams tradicionales
          const streamToBuffer = (
            stream: NodeJS.ReadableStream,
          ): Promise<Buffer> =>
            new Promise((resolveBuffer, reject) => {
              const chunks: Buffer[] = [];
              stream.on('data', (chunk: Buffer) => chunks.push(chunk));
              stream.on('error', reject);
              stream.on('end', () => resolveBuffer(Buffer.concat(chunks)));
            });
          return streamToBuffer(body as unknown as NodeJS.ReadableStream);
        } else if (typeof bodyDesconocido.getReader === 'function') {
          // Fallback para Web ReadableStream
          const reader = bodyDesconocido.getReader();
          const chunks: Uint8Array[] = [];
          let done = false;
          while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
              chunks.push(result.value);
            }
          }
          const totalLength = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0,
          );
          const buffer = Buffer.alloc(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            buffer.set(chunk, offset);
            offset += chunk.length;
          }
          return buffer;
        } else {
          throw new Error('Unsupported response body type from S3');
        }
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error obteniendo buffer de Wasabi: ${mensaje}`);
        throw new NotFoundException(
          'No se pudo obtener el archivo de la plantilla',
        );
      }
    } else {
      // Local - SEGURIDAD: Validar path traversal
      // Nunca aceptar rutas absolutas directamente - siempre tratar como relativas
      const relativePath = key.startsWith(UPLOADS_DIR)
        ? key.substring(UPLOADS_DIR.length).replace(/^[/\\]+/, '')
        : key;

      const fullPath = this.validateAndResolvePath(relativePath);

      if (!existsSync(fullPath)) {
        throw new NotFoundException(
          'Archivo de plantilla no encontrado localmente',
        );
      }
      return readFileSync(fullPath);
    }
  }

  /**
   * Verifica si estamos usando Wasabi o almacenamiento local
   */
  isUsingWasabi(): boolean {
    return useWasabi;
  }

  // --- MÉTODOS LEGACY (ADAPTADOS PARA HÍBRIDO) ---

  /**
   * Procesa un archivo subido y retorna la información
   * Modificado para soportar Wasabi leyendo desde disco temporal
   * SEGURIDAD: Valida magic bytes antes de procesar
   */
  async processUpload(
    file: Express.Multer.File,
    categoria: string = 'temp',
    opciones: ProcessUploadOptions = {},
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Detectar modo de almacenamiento de Multer:
    // - memoryStorage(): file.buffer existe, file.filename suele ser undefined
    // - diskStorage(): file.path/filename existen, file.buffer es undefined
    const isMemoryStorage = !!file.buffer && !file.filename;

    // Generar nombre y path destino (común a ambos modos).
    const filename =
      file.filename ??
      `${uuidv4()}-${Date.now()}${extname(file.originalname).toLowerCase()}`;
    const relativePath = `${categoria}/${filename}`;
    const fullLocalPath = join(UPLOADS_DIR, relativePath);

    // SEGURIDAD: Validar magic bytes según el modo.
    // Esto previene que archivos maliciosos (ej: PHP con extensión .jpg) sean aceptados.
    if (isMemoryStorage) {
      validateAndSecureBuffer(file.buffer, file.mimetype);
    } else {
      validateAndSecureFile(fullLocalPath, file.mimetype);
    }

    let finalPath = relativePath;
    let finalUrl = `/uploads/${relativePath}`;

    if (useWasabi && s3Client) {
      try {
        // Obtener el buffer del archivo según el modo.
        const fileBuffer = isMemoryStorage
          ? file.buffer
          : existsSync(fullLocalPath)
            ? readFileSync(fullLocalPath)
            : null;
        if (!fileBuffer) {
          this.logger.error(`Archivo no disponible: ${fullLocalPath}`);
          throw new Error('Archivo no disponible para subir a Wasabi');
        }

        const key = relativePath;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: file.mimetype,
          }),
        );

        this.logger.log(`Upload: Movido a Wasabi: ${key}`);

        // Solo eliminar disco si veníamos de diskStorage.
        if (!isMemoryStorage && existsSync(fullLocalPath)) {
          unlinkSync(fullLocalPath);
        }

        finalPath = key;
        finalUrl = this.getFileUrl(key);
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error moviendo archivo a Wasabi: ${mensaje}`);
      }
    } else if (isMemoryStorage) {
      // Si no hay Wasabi y el archivo está solo en memoria, persistirlo a disco
      // para que finalPath/finalUrl sean válidos.
      const targetDir = join(UPLOADS_DIR, categoria);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      writeFileSync(fullLocalPath, file.buffer);
    }

    // SEGURIDAD: registrar la propiedad del archivo para autorizar acceso
    // cross-tenant al servirlo. La key registrada es la key de almacenamiento
    // real (finalPath), no la URL.
    await this.registrarArchivo(finalPath, {
      categoria,
      mime: file.mimetype,
      size: file.size,
      empresa_id: opciones.empresa_id,
      subido_por_id: opciones.subido_por_id,
      publico: opciones.publico,
    });

    return {
      success: true,
      file: {
        filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: finalPath,
        url: finalUrl,
      },
      message: 'Archivo subido correctamente',
    };
  }

  /**
   * Procesa múltiples archivos
   */
  async processMultipleUploads(
    files: Express.Multer.File[],
    categoria: string = 'temp',
    opciones: ProcessUploadOptions = {},
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const promises = files.map((file) =>
      this.processUpload(file, categoria, opciones),
    );
    return Promise.all(promises);
  }

  /**
   * Elimina un archivo (síncrono para almacenamiento local)
   * SEGURIDAD: Valida path traversal antes de eliminar
   * NOTA: Para Wasabi usar deleteFileAsync
   */
  deleteFile(relativePath: string): { success: boolean; message: string } {
    if (useWasabi) {
      // IMPORTANTE: Para Wasabi, usar deleteFileAsync en su lugar
      // Este método síncrono no puede garantizar la eliminación en Wasabi
      this.logger.warn(
        'deleteFile llamado con Wasabi - usar deleteFileAsync para operaciones confiables',
      );
      throw new BadRequestException(
        'Usar deleteFileAsync para eliminar archivos de Wasabi',
      );
    }

    // SEGURIDAD: Validar path traversal
    const fullPath = this.validateAndResolvePath(relativePath);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    try {
      unlinkSync(fullPath);
      return {
        success: true,
        message: 'Archivo eliminado correctamente',
      };
    } catch {
      throw new BadRequestException('Error al eliminar el archivo');
    }
  }

  /**
   * Elimina un archivo de forma asíncrona (para Wasabi S3)
   * SEGURIDAD: Valida path traversal antes de eliminar
   * IMPORTANTE: Espera a que la eliminación complete antes de retornar
   */
  async deleteFileAsync(
    relativePath: string,
  ): Promise<{ success: boolean; message: string }> {
    if (useWasabi) {
      try {
        // SEGURIDAD: La validación se hace dentro de deleteFileHybrid
        await this.deleteFileHybrid(relativePath);
        return {
          success: true,
          message: 'Archivo eliminado correctamente',
        };
      } catch (error: unknown) {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error deleting file from Wasabi: ${mensaje}`);
        return {
          success: false,
          message: `Error al eliminar archivo: ${mensaje}`,
        };
      }
    }

    // Para almacenamiento local, usar la versión síncrona
    return this.deleteFile(relativePath);
  }

  /**
   * Verifica si un archivo existe
   * SEGURIDAD: Valida path traversal antes de verificar
   */
  fileExists(relativePath: string): boolean {
    if (useWasabi) return true; // Asumimos true para no romper validaciones sincronas

    try {
      // SEGURIDAD: Validar path traversal
      const fullPath = this.validateAndResolvePath(relativePath);
      return existsSync(fullPath);
    } catch (error: unknown) {
      // Si la validacion falla (path traversal), retornar false
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SECURITY] fileExists validation failed: ${mensaje}`);
      return false;
    }
  }

  /**
   * Obtiene informacion de un archivo
   * SEGURIDAD: Valida path traversal antes de obtener info
   */
  getFileInfo(relativePath: string): {
    exists: boolean;
    size?: number;
    extension?: string;
  } {
    // SEGURIDAD: Validar path traversal primero (incluso para Wasabi)
    try {
      // Para Wasabi validamos la key
      if (useWasabi) {
        this.validateS3Key(relativePath);
        return {
          exists: true,
          size: 0,
          extension: extname(relativePath),
        };
      }

      // Para local, validar path
      const fullPath = this.validateAndResolvePath(relativePath);

      if (!existsSync(fullPath)) {
        return { exists: false };
      }

      const stats = statSync(fullPath);
      return {
        exists: true,
        size: stats.size,
        extension: extname(relativePath),
      };
    } catch (error: unknown) {
      // Si la validacion falla, retornar no existe
      const mensaje = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SECURITY] getFileInfo validation failed: ${mensaje}`);
      return { exists: false };
    }
  }

  /**
   * Obtiene las categorías de upload disponibles
   */
  getCategories(): string[] {
    return Object.keys(UPLOAD_PATHS);
  }

  /**
   * Valida que la categoría sea válida
   */
  validateCategory(categoria: string): boolean {
    return Object.keys(UPLOAD_PATHS).includes(categoria);
  }

  /**
   * Formatea el tamaño del archivo para mostrar
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- PROPIEDAD DE ARCHIVOS (autorizacion cross-tenant) ---

  /**
   * Registra (o actualiza) la propiedad de un archivo en la tabla `archivos`.
   *
   * La `empresa_id` y `subido_por_id` se toman del parametro explicito o, en su
   * defecto, del contexto del request autenticado. Si no hay empresa resoluble,
   * NO se crea el registro (se registra una advertencia) para no dejar archivos
   * huerfanos sin propiedad — quedarian inaccesibles, que es el comportamiento
   * seguro por defecto.
   *
   * @param key Key de almacenamiento real (no la URL del proxy).
   */
  async registrarArchivo(
    key: string,
    datos: {
      categoria: string;
      mime?: string | null;
      size?: number | null;
      empresa_id?: number;
      subido_por_id?: number | null;
      publico?: boolean;
    },
  ): Promise<Archivo | null> {
    const keyLimpia = extraerKeyDeValor(key);
    if (!keyLimpia) {
      this.logger.warn(
        `[ARCHIVO] No se pudo extraer key valida para registrar: ${key}`,
      );
      return null;
    }

    const empresaId =
      datos.empresa_id ?? RequestContextService.getEmpresaId() ?? null;
    if (!empresaId) {
      this.logger.warn(
        `[ARCHIVO] Sin empresa_id resoluble; no se registra propiedad de ${keyLimpia}`,
      );
      return null;
    }

    const subidoPorId =
      datos.subido_por_id ?? RequestContextService.getUserId() ?? null;
    const publico = datos.publico ?? esCategoriaPublica(datos.categoria);

    return this.prisma.archivo.upsert({
      where: { key: keyLimpia },
      create: {
        key: keyLimpia,
        empresa_id: empresaId,
        categoria: datos.categoria,
        publico,
        subido_por_id: subidoPorId,
        mime: datos.mime ?? null,
        size: datos.size ?? null,
      },
      update: {
        categoria: datos.categoria,
        publico,
        mime: datos.mime ?? undefined,
        size: datos.size ?? undefined,
      },
    });
  }

  /**
   * Obtiene el registro de propiedad de un archivo por su key (desenredada).
   */
  async getArchivoByKey(key: string): Promise<Archivo | null> {
    const keyLimpia = extraerKeyDeValor(key);
    if (!keyLimpia) {
      return null;
    }
    return this.prisma.archivo.findUnique({ where: { key: keyLimpia } });
  }

  /**
   * Marca un archivo como publico o privado. Se usa cuando se confirma el rol
   * de un archivo al asociarlo a un campo conocido (ej. Empresa.logo_url => el
   * archivo es un logo => publico=true).
   */
  async marcarArchivoPublico(
    key: string,
    publico: boolean,
    categoria?: string,
  ): Promise<void> {
    const keyLimpia = extraerKeyDeValor(key);
    if (!keyLimpia) {
      return;
    }
    await this.prisma.archivo.updateMany({
      where: { key: keyLimpia },
      data: {
        publico,
        ...(categoria ? { categoria } : {}),
      },
    });
  }

  /**
   * Valida que un valor recibido del cliente (key o URL) corresponda a un
   * `Archivo` que pertenece a la empresa indicada, y devuelve la key limpia
   * para persistir. Previene mass assignment de URLs arbitrarias / cross-tenant.
   *
   * @returns La key limpia si el archivo pertenece a la empresa; lanza
   *          ForbiddenException si pertenece a otra empresa; devuelve el valor
   *          tal cual (desenredado) si no existe registro `Archivo` todavia
   *          (compatibilidad con datos previos al backfill).
   */
  async resolverKeyPropia(
    valor: string | null | undefined,
    empresaId: number,
  ): Promise<string | null> {
    if (!valor) {
      return valor ?? null;
    }

    const keyLimpia = extraerKeyDeValor(valor);
    if (!keyLimpia) {
      // No mapeable a una key (URL externa): rechazar para no persistir basura.
      throw new BadRequestException('Referencia de archivo no valida');
    }

    const archivo = await this.prisma.archivo.findUnique({
      where: { key: keyLimpia },
    });

    if (archivo && archivo.empresa_id !== empresaId) {
      this.logger.warn(
        `[SECURITY] Mass assignment cross-tenant bloqueado: empresa ${empresaId} intento referenciar archivo ${keyLimpia} de empresa ${archivo.empresa_id}`,
      );
      throw new ForbiddenException('No tiene acceso a este archivo');
    }

    return keyLimpia;
  }
}
