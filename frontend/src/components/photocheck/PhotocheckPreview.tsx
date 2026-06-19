'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { pdf } from '@react-pdf/renderer';
import { Empleado } from '@/types';
import { getAccessToken } from '@/lib/api';
import { PhotocheckDocument } from './PhotocheckDocument';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

// Importar PDFViewer dinamicamente para evitar errores de SSR
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <PreviewSkeleton /> }
);

// Función para cargar imagen con JWT y convertir a base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const token = getAccessToken();
    console.log('[PhotocheckPreview] Fetching image:', { url, hasToken: !!token });
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    console.log('[PhotocheckPreview] Response:', { status: response.status, ok: response.ok });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function PreviewSkeleton() {
  return (
    <div className="w-full h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

interface PhotocheckPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: Empleado;
  empresaLogo?: string;
  empresaNombre?: string;
  empresaTelefono?: string;
  centroControl?: string;
  onGenerated?: () => void;
}

const DEFAULT_LOGO_PATH = '/images/LogoConsorcioEmir-Avp.png';

export function PhotocheckPreview({
  open,
  onOpenChange,
  empleado,
  empresaLogo,
  empresaNombre = 'ERMIR',
  empresaTelefono,
  centroControl,
  onGenerated,
}: PhotocheckPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [loadingFoto, setLoadingFoto] = useState(false);

  // react-pdf requiere URLs absolutas
  const getAbsoluteUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  };

  // Construir URL completa de la foto del empleado
  const getFotoUrl = (fotoPath: string | undefined | null): string | null => {
    if (!fotoPath) return null;
    // Si ya es URL completa, usarla directamente
    if (fotoPath.startsWith('http')) return fotoPath;
    // Si es path relativo, construir URL con el endpoint de archivos protegidos
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${apiUrl}/files/key/${encodeURIComponent(fotoPath)}`;
  };

  // Cargar foto del empleado como base64 cuando se abre el diálogo
  useEffect(() => {
    if (!open) {
      setFotoBase64(null);
      return;
    }

    const fotoUrl = getFotoUrl(empleado.foto_url);
    if (!fotoUrl) {
      setFotoBase64(null);
      return;
    }

    setLoadingFoto(true);
    fetchImageAsBase64(fotoUrl)
      .then((base64) => {
        setFotoBase64(base64);
      })
      .finally(() => {
        setLoadingFoto(false);
      });
  }, [open, empleado.foto_url]);

  const logo = getAbsoluteUrl(empresaLogo || DEFAULT_LOGO_PATH);

  const nombreCompleto = `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = (
        <PhotocheckDocument
          empleado={empleado}
          empresaLogo={logo}
          empresaNombre={empresaNombre}
          empresaTelefono={empresaTelefono}
          centroControl={centroControl}
          fotoBase64={fotoBase64}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `photocheck-${empleado.numero_documento}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success('Photocheck descargado correctamente');
      onGenerated?.();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el photocheck');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setDownloading(true);
    try {
      const doc = (
        <PhotocheckDocument
          empleado={empleado}
          empresaLogo={logo}
          empresaNombre={empresaNombre}
          empresaTelefono={empresaTelefono}
          centroControl={centroControl}
          fotoBase64={fotoBase64}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Abrir en nueva ventana para imprimir
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        };
      } else {
        URL.revokeObjectURL(url);
      }

      onGenerated?.();
    } catch (error) {
      console.error('Error al imprimir:', error);
      toast.error('Error al preparar la impresion');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90dvh] sm:h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header fijo */}
        <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-3 border-b">
          <DialogTitle className="text-base sm:text-lg truncate">Photocheck - {nombreCompleto}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Vista previa del photocheck.
          </DialogDescription>
        </DialogHeader>

        {/* Contenido scrollable — ocupa todo el espacio disponible */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Vista previa del PDF */}
          <div className="border rounded-lg overflow-hidden bg-slate-50 h-[300px] sm:h-[450px]">
            {loadingFoto ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <PhotocheckDocument
                  empleado={empleado}
                  empresaLogo={logo}
                  empresaNombre={empresaNombre}
                  empresaTelefono={empresaTelefono}
                  centroControl={centroControl}
                  fotoBase64={fotoBase64}
                />
              </PDFViewer>
            )}
          </div>

          {/* Informacion del empleado */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-4">
              <div>
                <span className="text-muted-foreground">Documento:</span>
                <span className="ml-1 sm:ml-2 font-medium">{empleado.tipo_documento} {empleado.numero_documento}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <span className="ml-1 sm:ml-2 font-medium">{empleado.cargo?.nombre || 'Sin asignar'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sede:</span>
                <span className="ml-1 sm:ml-2 font-medium">{empleado.sede?.nombre || 'Sin asignar'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo */}
        <div className="shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-t bg-background">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={downloading} className="w-full sm:w-auto">
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Imprimir
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading} className="w-full sm:w-auto">
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
