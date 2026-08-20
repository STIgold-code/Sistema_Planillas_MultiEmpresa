import { Injectable, Logger } from '@nestjs/common';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { existsSync, statSync } from 'fs';
import { join, normalize } from 'path';
import { s3Client, bucketName, useWasabi } from '../../config/wasabi.config';
import { UPLOADS_DIR } from './uploads.config';
import { obtenerMensajeError } from '../../common/utils/error.util';

/**
 * Consulta el estado de un objeto ya almacenado, sin leerlo.
 *
 * Existe como servicio aparte de `UploadsService` por dos razones: subir y
 * verificar son responsabilidades distintas (quien sube no debería ser el
 * único que se cree a sí mismo), y `UploadsService` ya está en el límite de
 * tamaño del proyecto. Reutiliza el mismo cliente S3 configurado en
 * `wasabi.config` que usa `UploadsService`, así que no duplica credenciales
 * ni endpoint.
 */
@Injectable()
export class AlmacenamientoObjetosService {
  private readonly logger = new Logger(AlmacenamientoObjetosService.name);

  /**
   * Devuelve el tamaño en bytes del objeto guardado bajo `key`, o `null` si no
   * existe o no se pudo confirmar su existencia.
   *
   * Cualquier fallo de la consulta (objeto ausente, credenciales inválidas,
   * bucket equivocado) se traduce a `null` a propósito: para quien verifica un
   * backup, "no puedo confirmar que está" y "no está" tienen la misma
   * consecuencia, y ambos deben ser un fallo ruidoso. La causa concreta queda
   * en el log.
   */
  async obtenerTamanioObjeto(key: string): Promise<number | null> {
    if (useWasabi && s3Client) {
      try {
        const respuesta = await s3Client.send(
          new HeadObjectCommand({ Bucket: bucketName, Key: key }),
        );
        return respuesta.ContentLength ?? null;
      } catch (error: unknown) {
        this.logger.warn(
          `No se pudo verificar el objeto "${key}" en el bucket ` +
            `"${bucketName}": ${obtenerMensajeError(error)}`,
        );
        return null;
      }
    }

    // Almacenamiento local: mismo destino que usa `UploadsService.uploadStream`.
    const rutaRelativa = normalize(key);
    if (rutaRelativa.includes('..')) {
      this.logger.warn(`[SECURITY] Key con traversal rechazada: ${key}`);
      return null;
    }

    const rutaCompleta = join(UPLOADS_DIR, rutaRelativa);
    return existsSync(rutaCompleta) ? statSync(rutaCompleta).size : null;
  }
}
