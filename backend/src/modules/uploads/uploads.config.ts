import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Tipos de archivo permitidos por categoría
export const ALLOWED_MIME_TYPES = {
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  all: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
};

// Extensiones permitidas
export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

// Tamaño máximo: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Directorio base de uploads
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

// Subdirectorios por tipo
export const UPLOAD_PATHS = {
  documentos: 'documentos',
  evaluaciones: 'evaluaciones',
  empleados: 'empleados',
  postulantes: 'postulantes',
  contratos: 'contratos',
  plantillas: 'plantillas',
  empresas: 'empresas',
  temp: 'temp',
};

// Asegurar que existan los directorios
export function ensureUploadDirs() {
  Object.values(UPLOAD_PATHS).forEach((subdir) => {
    const fullPath = join(UPLOADS_DIR, subdir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Configuración de almacenamiento para Multer
export const multerStorage = (subdir: string = 'temp') =>
  diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = join(UPLOADS_DIR, subdir);
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generar nombre único: uuid + timestamp + extensión original
      const uniqueSuffix = `${uuidv4()}-${Date.now()}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

// Filtro de archivos
export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();

  // Validar extensión
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new BadRequestException(
        `Extensión no permitida: ${ext}. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  }

  // Validar MIME type
  if (!ALLOWED_MIME_TYPES.all.includes(file.mimetype)) {
    return cb(
      new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`),
      false,
    );
  }

  cb(null, true);
};

// Opciones de Multer
export const multerOptions = (subdir: string = 'temp') => ({
  storage: multerStorage(subdir),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * SEGURIDAD: Magic bytes (file signatures) para validación real del contenido
 * Estos son los primeros bytes que identifican el tipo real de archivo
 */
export const MAGIC_BYTES: Record<string, Buffer[]> = {
  // Imágenes
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  ],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header

  // PDF
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF

  // Microsoft Office (Legacy .doc, .xls)
  'application/msword': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  ],
  'application/vnd.ms-excel': [
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  ],

  // Microsoft Office (Modern .docx, .xlsx) - ZIP format
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK ZIP header
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE header (e.g. password protected or renamed .doc)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK ZIP header
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE header (e.g. password protected or renamed .xls)
  ],
};

/**
 * SEGURIDAD: Valida que los magic bytes del archivo coincidan con el tipo MIME declarado
 * @param filePath Ruta completa al archivo
 * @param declaredMimeType MIME type declarado por el cliente
 * @returns true si el archivo es válido, false si los magic bytes no coinciden
 */
/**
 * Validación interna sobre un buffer ya cargado en memoria.
 * Es la fuente de verdad de la lógica de magic bytes —
 * tanto validateMagicBytes (disco) como validateMagicBytesBuffer (memoria)
 * delegan a esta función.
 */
function validateMagicBytesFromBuffer(
  fileBuffer: Buffer,
  declaredMimeType: string,
): boolean {
  const expectedSignatures = MAGIC_BYTES[declaredMimeType];

  // Si no hay firma definida para este tipo, permitir (compatibilidad).
  if (!expectedSignatures || expectedSignatures.length === 0) {
    return true;
  }

  const maxSignatureLength = Math.max(
    ...expectedSignatures.map((s) => s.length),
  );
  if (fileBuffer.length < maxSignatureLength) {
    console.error(`[DEBUG] Archivo muy pequeño (${fileBuffer.length} bytes)`);
    return false;
  }

  for (const signature of expectedSignatures) {
    const fileStart = fileBuffer.subarray(0, signature.length);
    if (signature.equals(fileStart)) return true;
  }

  // Para WebP, también verificar marcador WEBP en offset 8.
  if (declaredMimeType === 'image/webp') {
    const webpMarker = fileBuffer.subarray(8, 12).toString('ascii');
    if (webpMarker === 'WEBP') return true;
  }

  console.error(
    `[SECURITY] Magic Bytes verification failed. ` +
      `MIME: ${declaredMimeType}. ` +
      `File Hex: ${fileBuffer.subarray(0, 16).toString('hex')}...`,
  );
  return false;
}

export function validateMagicBytes(
  filePath: string,
  declaredMimeType: string,
): boolean {
  try {
    const fileBuffer = readFileSync(filePath);
    return validateMagicBytesFromBuffer(fileBuffer, declaredMimeType);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`[SECURITY] Error validando magic bytes: ${mensaje}`);
    return false;
  }
}

/**
 * Variante de validateMagicBytes que opera sobre un buffer en memoria,
 * sin requerir que el archivo esté en disco. Necesaria cuando se usa
 * memoryStorage() de Multer en lugar de diskStorage().
 */
export function validateMagicBytesBuffer(
  fileBuffer: Buffer,
  declaredMimeType: string,
): boolean {
  try {
    return validateMagicBytesFromBuffer(fileBuffer, declaredMimeType);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(
      `[SECURITY] Error validando magic bytes buffer: ${mensaje}`,
    );
    return false;
  }
}

/**
 * SEGURIDAD: Valida un archivo después de que Multer lo guarda
 * Si falla la validación, elimina el archivo
 * @param filePath Ruta completa al archivo
 * @param declaredMimeType MIME type declarado
 * @throws BadRequestException si el archivo no pasa la validación de magic bytes
 */
export function validateAndSecureFile(
  filePath: string,
  declaredMimeType: string,
): void {
  if (!validateMagicBytes(filePath, declaredMimeType)) {
    // Eliminar el archivo malicioso
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Ignorar errores al eliminar
    }

    throw new BadRequestException(
      'El contenido del archivo no coincide con el tipo declarado. ' +
        'Esto puede indicar un intento de subir un archivo malicioso.',
    );
  }
}

/**
 * Variante de validateAndSecureFile que opera sobre un buffer en memoria.
 * Usar cuando se usa memoryStorage() de Multer — el archivo aún no está
 * en disco al momento de validar.
 *
 * @throws BadRequestException si los magic bytes no coinciden con el MIME declarado
 */
export function validateAndSecureBuffer(
  fileBuffer: Buffer,
  declaredMimeType: string,
): void {
  if (!validateMagicBytesBuffer(fileBuffer, declaredMimeType)) {
    throw new BadRequestException(
      'El contenido del archivo no coincide con el tipo declarado. ' +
        'Esto puede indicar un intento de subir un archivo malicioso.',
    );
  }
}
