'use client';

import { useState, useEffect } from 'react';
import { obtenerBlobArchivo } from '@/lib/archivos';

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
        const blob = await obtenerBlobArchivo(url);
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
