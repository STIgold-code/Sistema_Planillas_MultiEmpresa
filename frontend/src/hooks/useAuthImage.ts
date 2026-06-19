'use client';

import { useState, useEffect } from 'react';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Normaliza una referencia de archivo a una URL absoluta fetcheable.
 * - URL absoluta (http/https) -> usar tal cual
 * - blob: URL -> usar tal cual
 * - Storage key (ej: "empleados/UUID.jpg") -> construir URL del backend
 */
function normalizeImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_URL}/files/key/${encodeURIComponent(url)}`;
}

/**
 * Hook que carga una imagen protegida por JWT y devuelve un blob URL
 * para usar en <img src={blobUrl} />
 */
export function useAuthImage(url: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    let revoked = false;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const resolvedUrl = normalizeImageUrl(url);
        const token = getAccessToken();
        const res = await fetch(resolvedUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          setBlobUrl(null);
          return;
        }

        const blob = await res.blob();
        if (!revoked) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch {
        setBlobUrl(null);
      }
    };

    fetchImage();

    return () => {
      revoked = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return blobUrl;
}
