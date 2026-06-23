'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  File,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';

interface FileItem {
  id?: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string;
}

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileItem[];
  initialIndex?: number;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  files,
  initialIndex = 0,
}: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Estados para cargar archivo con autenticación
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFile = files[currentIndex];

  const isImage = (file: FileItem) => {
    const tipo = file.archivo_tipo?.toLowerCase() || '';
    const url = file.archivo_url.toLowerCase();
    return (
      tipo.startsWith('image/') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.gif') ||
      url.endsWith('.webp')
    );
  };

  const isPdf = (file: FileItem) => {
    const tipo = file.archivo_tipo?.toLowerCase() || '';
    const url = file.archivo_url.toLowerCase();
    return tipo === 'application/pdf' || url.endsWith('.pdf');
  };

  // Función para cargar archivo con token JWT
  const loadFileWithAuth = useCallback(async (file: FileItem) => {
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    try {
      const token = getAccessToken();

      const response = await fetch(file.archivo_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err) {
      console.error('Error cargando archivo:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el archivo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar archivo cuando cambia el archivo actual o se abre el modal
  useEffect(() => {
    if (open && currentFile) {
      loadFileWithAuth(currentFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentFile?.archivo_url]);

  // Limpiar blob URL al desmontar
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Reset index cuando se abre el modal
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
    resetView();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
    resetView();
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onOpenChange(false);
  };

  // Función para descargar con autenticación
  const handleDownload = async () => {
    if (!currentFile) return;

    try {
      const token = getAccessToken();
      const response = await fetch(currentFile.archivo_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.archivo_nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando archivo:', err);
    }
  };

  // Función para abrir en nueva pestaña con autenticación
  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  if (!currentFile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Base: flex column para estructura header/content/footer
          'flex flex-col p-0 gap-0',
          // Móvil: pantalla completa
          'w-full h-full max-w-full max-h-full rounded-none',
          // Tablet y superior: modal con tamaño limitado
          'sm:w-[95vw] sm:h-[90vh] sm:max-w-5xl sm:max-h-[90vh] sm:rounded-lg'
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header - FIJO */}
        <DialogHeader className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 border-b flex-row items-center justify-between space-y-0 bg-background">
          <DialogTitle className="text-xs sm:text-sm font-medium truncate max-w-[40%] sm:max-w-[50%]">
            {currentFile.archivo_nombre}
          </DialogTitle>
          <div className="flex items-center gap-0.5 sm:gap-1 mr-8 sm:mr-6">
            {isImage(currentFile) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  title="Alejar"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-10 sm:w-12 text-center hidden sm:inline">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  title="Acercar"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRotate}
                  title="Rotar"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Descargar"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenNewTab}
              title="Abrir en nueva pestaña"
              disabled={!blobUrl}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content - SCROLLEABLE (flex-1 toma el espacio restante) */}
        <div className="flex-1 relative overflow-hidden bg-muted/30 min-h-0">
          {/* Navigation arrows */}
          {files.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          )}

          {/* File preview - área scrolleable */}
          <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin" />
                <p className="text-xs sm:text-sm">Cargando archivo...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-muted-foreground px-4">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500" />
                <p className="text-base sm:text-lg font-medium">Error al cargar</p>
                <p className="text-xs sm:text-sm text-center max-w-md">{error}</p>
                <Button onClick={() => loadFileWithAuth(currentFile)} size="sm">
                  Reintentar
                </Button>
              </div>
            ) : blobUrl ? (
              isImage(currentFile) ? (
                // blobUrl es un blob URL de fetch autenticado, no optimizable por next/image
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blobUrl}
                  alt={currentFile.archivo_nombre}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              ) : isPdf(currentFile) ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0 rounded"
                  title={currentFile.archivo_nombre}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-muted-foreground px-4">
                  <File className="h-16 w-16 sm:h-20 sm:w-20" />
                  <p className="text-base sm:text-lg font-medium text-center">{currentFile.archivo_nombre}</p>
                  <p className="text-xs sm:text-sm text-center">Vista previa no disponible para este tipo de archivo</p>
                  <Button onClick={handleDownload} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar archivo
                  </Button>
                </div>
              )
            ) : null}
          </div>
        </div>

        {/* Footer - FIJO */}
        {files.length > 1 && (
          <div className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2 border-t flex items-center justify-center gap-2 bg-background">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {currentIndex + 1} de {files.length}
            </span>
            <div className="flex gap-1">
              {files.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  onClick={() => {
                    setCurrentIndex(index);
                    resetView();
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
