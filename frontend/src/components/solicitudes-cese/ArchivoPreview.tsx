'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ArchivoPreviewProps {
  archivo: {
    id: number;
    archivo_url: string;
    archivo_nombre: string;
    archivo_tipo?: string | null;
    archivo_tamano?: number | null;
  };
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAuthUrl(storedUrl: string): string {
  if (storedUrl.startsWith('http') || storedUrl.startsWith('blob:')) {
    return storedUrl;
  }
  return `${API_URL}/files/key/${encodeURIComponent(storedUrl)}`;
}

/**
 * Fetchea un archivo con autorización JWT y devuelve un blob URL.
 * Usado para preview inline de PDF e imágenes en el dialog del admin.
 */
function useAuthBlob(url: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    let revoked = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);

    const fetchBlob = async () => {
      try {
        const resolved = buildAuthUrl(url);
        const token = getAccessToken();
        const res = await fetch(resolved, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError(true);
          return;
        }
        const blob = await res.blob();
        if (!revoked) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch {
        setError(true);
      } finally {
        if (!revoked) setLoading(false);
      }
    };

    fetchBlob();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { blobUrl, loading, error };
}

export function ArchivoPreview({ archivo }: ArchivoPreviewProps) {
  const tipo = archivo.archivo_tipo ?? '';
  const isImage = tipo.startsWith('image/');
  const isPdf = tipo === 'application/pdf';
  const isPreviewable = isImage || isPdf;

  const { blobUrl, loading, error } = useAuthBlob(isPreviewable ? archivo.archivo_url : null);

  function handleDownload() {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = archivo.archivo_nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // Fallback: abrir en nueva pestaña con token
    const url = buildAuthUrl(archivo.archivo_url);
    window.open(url, '_blank');
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {isImage ? (
            <ImageIcon className="h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span className="truncate text-sm font-medium" title={archivo.archivo_nombre}>
            {archivo.archivo_nombre}
          </span>
          {archivo.archivo_tamano && (
            <span className="shrink-0 text-xs text-muted-foreground">
              ({formatFileSize(archivo.archivo_tamano)})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="shrink-0 h-7 px-2"
          aria-label="Descargar archivo"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview area */}
      <div className="bg-muted/10 min-h-[200px] flex items-center justify-center">
        {!isPreviewable && (
          <p className="text-sm text-muted-foreground p-4">
            Vista previa no disponible para este formato. Usa el botón de descarga.
          </p>
        )}
        {isPreviewable && loading && (
          <div className="flex flex-col items-center gap-2 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cargando...</p>
          </div>
        )}
        {isPreviewable && error && (
          <p className="text-sm text-red-600 p-4">No se pudo cargar el archivo</p>
        )}
        {isPreviewable && !loading && !error && blobUrl && isImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={blobUrl}
            alt={archivo.archivo_nombre}
            className="max-h-[400px] w-auto object-contain"
          />
        )}
        {isPreviewable && !loading && !error && blobUrl && isPdf && (
          <iframe
            src={blobUrl}
            title={archivo.archivo_nombre}
            className="w-full h-[500px] border-0"
          />
        )}
      </div>
    </div>
  );
}
