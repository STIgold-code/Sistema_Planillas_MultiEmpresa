/**
 * Utilidades para extraer la KEY de almacenamiento real a partir de un valor
 * persistido en BD, que puede ser:
 *   - una key cruda (ej. "documentos/uuid-123.pdf")
 *   - una URL del proxy (ej. "http://host/api/files/key/documentos%2Fuuid.pdf")
 *   - una URL corrupta con multiple encoding o anidamiento de proxy
 *
 * Esta logica es la fuente de verdad para "desenredar" valores y debe usarse
 * tanto al servir/validar como en el backfill, garantizando consistencia.
 */

/**
 * Desenreda un valor almacenado (key cruda o URL del proxy) y devuelve la key
 * de almacenamiento limpia. Devuelve `null` si el valor apunta a una URL
 * externa que no pertenece a nuestro proxy (no se puede mapear a una key).
 */
export function extraerKeyDeValor(valor: string): string | null {
  if (!valor || typeof valor !== 'string') {
    return null;
  }

  let current = valor.trim();

  for (let i = 0; i < 10; i++) {
    // Si es una URL completa, intentar extraer la key del path del proxy.
    if (current.startsWith('http://') || current.startsWith('https://')) {
      const match = current.match(/\/api\/files\/(?:key|local)\/(.+)$/);
      if (match) {
        current = safeDecode(match[1]);
        continue;
      }
      // URL pública del proxy (logos/assets).
      const matchPublic = current.match(
        /\/api\/files\/(?:public|local\/public)\/(.+)$/,
      );
      if (matchPublic) {
        current = safeDecode(matchPublic[1]);
        continue;
      }
      // URL externa que no es de nuestro proxy: no mapeable a una key.
      return null;
    }

    // Si esta URL-encoded (ej. "https%3A..." o "documentos%2F..."), decodificar.
    const decoded = safeDecode(current);
    if (decoded !== current) {
      current = decoded;
      continue;
    }

    break;
  }

  // Si tras desenredar sigue siendo una URL externa, no es mapeable.
  if (current.startsWith('http://') || current.startsWith('https://')) {
    return null;
  }

  // Normalizar separadores y quitar slashes iniciales.
  const key = current.replace(/\\/g, '/').replace(/^\/+/, '').trim();

  return key.length > 0 ? key : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
