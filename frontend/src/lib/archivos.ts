import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Resuelve una referencia de archivo guardada en base de datos al endpoint del
 * backend que la sirve, para que la descarga pase por el cliente central de la
 * API (token + refresh + header de empresa activa).
 *
 * - Storage key (ej: "empleados/UUID.jpg") -> `/files/key/<key>`
 * - URL absoluta del backend -> se recorta a su path
 * - URL externa (Wasabi firmada), `blob:` o `data:` -> null, no pasa por la API
 */
export function resolverEndpointArchivo(referencia: string): string | null {
  if (!referencia) {
    return null;
  }

  if (referencia.startsWith('blob:') || referencia.startsWith('data:')) {
    return null;
  }

  if (referencia.startsWith('http')) {
    if (API_URL && referencia.startsWith(API_URL)) {
      return referencia.slice(API_URL.length);
    }
    // Archivos del backend guardados con otro host (BACKEND_URL antiguo o
    // interno): se reutiliza solo el path para salir por el cliente de la API.
    const coincidencia = referencia.match(/\/api(\/files\/.+)$/);
    return coincidencia ? coincidencia[1] : null;
  }

  return `/files/key/${encodeURIComponent(referencia)}`;
}

/**
 * Descarga una referencia de archivo como Blob. Los archivos del backend van
 * por `api.getBlob`; los recursos externos o locales (`blob:`, URLs firmadas)
 * se piden directo, sin cabeceras de autenticación.
 */
export async function obtenerBlobArchivo(referencia: string): Promise<Blob> {
  const endpoint = resolverEndpointArchivo(referencia);
  if (endpoint !== null) {
    return api.getBlob(endpoint);
  }

  const respuesta = await fetch(referencia);
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`);
  }
  return respuesta.blob();
}
