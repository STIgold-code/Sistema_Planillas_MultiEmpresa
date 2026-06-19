import * as path from 'path';

/**
 * Assets estáticos del sistema (logo, plantillas) versionados en `backend/assets`.
 * A diferencia de `uploads/` —datos de usuario que viven en Wasabi y NO se
 * commitean— estos archivos son parte del build y viajan con el deploy.
 */
export const LOGO_ERMIR_PATH = path.resolve(
  process.cwd(),
  'assets',
  'logo-ermir-icon.png',
);
