'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getAccessToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Palmtree,
} from 'lucide-react';
import { toast } from 'sonner';

interface FiltroConfig {
  id: string;
  label: string;
  tipo: 'select' | 'date' | 'number';
  opciones?: { value: string; label: string }[];
  placeholder?: string;
  default?: string | number;
}

interface ReporteConfig {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  formatos: string[];
  filtros: FiltroConfig[];
}

const categoriaIconos: Record<string, React.ComponentType<{ className?: string }>> = {
  Empleados: Users,
  Planilla: DollarSign,
  Tareo: Calendar,
  Contratos: FileText,
  Vacaciones: Palmtree,
};

const categoriaBadgeColors: Record<string, string> = {
  Empleados: 'bg-blue-100 text-blue-800',
  Planilla: 'bg-green-100 text-green-800',
  Tareo: 'bg-orange-100 text-orange-800',
  Contratos: 'bg-purple-100 text-purple-800',
  Vacaciones: 'bg-teal-100 text-teal-800',
};

export default function GenerarReportePage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  const [loading, setLoading] = useState(true);
  const [reporte, setReporte] = useState<ReporteConfig | null>(null);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [contando, setContando] = useState(false);
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchReporteConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<ReporteConfig>(`/reportes/config/${codigo}`);
      setReporte(response);

      // Inicializar filtros con valores por defecto
      const defaultFiltros: Record<string, string> = {};
      response.filtros.forEach(f => {
        if (f.default !== undefined) {
          defaultFiltros[f.id] = String(f.default);
        }
      });
      setFiltros(defaultFiltros);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar configuración';
      toast.error(errorMessage);
      router.push('/configuracion/reportes');
    } finally {
      setLoading(false);
    }
  }, [codigo, router]);

  const contarRegistros = useCallback(async () => {
    if (!reporte) return;
    setContando(true);
    try {
      const response = await api.post<{ total: number }>('/reportes/contar', {
        codigo_reporte: codigo,
        filtros,
      });
      setTotalRegistros(response.total);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al contar registros';
      toast.error(errorMessage);
    } finally {
      setContando(false);
    }
  }, [codigo, filtros, reporte]);

  useEffect(() => {
    fetchReporteConfig();
  }, [fetchReporteConfig]);

  // Contar registros cuando cambian los filtros (con debounce de 800ms)
  useEffect(() => {
    if (!reporte) return;
    const timer = setTimeout(() => {
      contarRegistros();
    }, 800);
    return () => clearTimeout(timer);
  }, [filtros, reporte, contarRegistros]);

  const handleFiltroChange = (id: string, value: string) => {
    setFiltros(prev => {
      const newFiltros = { ...prev };
      if (value && value !== 'all') {
        newFiltros[id] = value;
      } else {
        delete newFiltros[id];
      }
      return newFiltros;
    });
  };

  const handleGenerar = async (formato: 'EXCEL' | 'PDF') => {
    if (!reporte) return;
    setGenerando(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reportes/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          codigo_reporte: codigo,
          formato,
          filtros,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al generar reporte');
      }

      const blobData = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1]
        || `${reporte.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Descargar archivo
      const url = window.URL.createObjectURL(blobData);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Reporte generado: ${totalRegistros?.toLocaleString() || 0} registros`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al generar reporte';
      toast.error(errorMessage);
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <p>Reporte no encontrado</p>
        <Button variant="link" onClick={() => router.push('/configuracion/reportes')}>
          Volver al catálogo
        </Button>
      </div>
    );
  }

  const IconComponent = categoriaIconos[reporte.categoria] || FileSpreadsheet;

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/configuracion/reportes')}
          className="w-fit -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al catálogo
        </Button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">{reporte.nombre}</h1>
              <Badge className={categoriaBadgeColors[reporte.categoria] || 'bg-gray-100'}>
                {reporte.categoria}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{reporte.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filtros */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>
              Configura los parámetros para generar el reporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reporte.filtros.map(filtro => (
                <div key={filtro.id} className="space-y-2">
                  <Label htmlFor={filtro.id}>{filtro.label}</Label>
                  {filtro.tipo === 'select' ? (
                    <Select
                      value={filtros[filtro.id] || ''}
                      onValueChange={(v) => handleFiltroChange(filtro.id, v)}
                    >
                      <SelectTrigger id={filtro.id}>
                        <SelectValue placeholder={filtro.placeholder || `Seleccionar ${filtro.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filtro.opciones?.map(opt => (
                          <SelectItem key={opt.value || 'empty'} value={opt.value || 'all'}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : filtro.tipo === 'date' ? (
                    <Input
                      type="date"
                      id={filtro.id}
                      value={filtros[filtro.id] || ''}
                      onChange={(e) => handleFiltroChange(filtro.id, e.target.value)}
                    />
                  ) : (
                    <Input
                      type="number"
                      id={filtro.id}
                      value={filtros[filtro.id] || ''}
                      onChange={(e) => handleFiltroChange(filtro.id, e.target.value)}
                      placeholder={filtro.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Panel de acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generar Reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contador de registros */}
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              {contando ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Contando registros...</span>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-primary">
                    {totalRegistros?.toLocaleString() ?? '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">registros encontrados</p>
                </>
              )}
            </div>

            {/* Formatos disponibles */}
            <div className="space-y-2">
              <Label>Formatos disponibles</Label>
              <div className="flex gap-2">
                {reporte.formatos.includes('excel') && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Excel
                  </Badge>
                )}
                {reporte.formatos.includes('pdf') && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    PDF
                  </Badge>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={totalRegistros === null || totalRegistros === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>

              {reporte.formatos.includes('excel') && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleGenerar('EXCEL')}
                  disabled={generando || totalRegistros === null || totalRegistros === 0}
                >
                  {generando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar Excel
                </Button>
              )}

              {reporte.formatos.includes('pdf') && (
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => handleGenerar('PDF')}
                  disabled={generando || totalRegistros === null || totalRegistros === 0}
                >
                  {generando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar PDF
                </Button>
              )}
            </div>

            {totalRegistros === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No hay registros con los filtros seleccionados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Preview */}
      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        codigo={codigo}
        filtros={filtros}
        totalRegistros={totalRegistros}
        reporte={reporte}
        onDownload={handleGenerar}
      />
    </div>
  );
}

// Componente del modal de preview
interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigo: string;
  filtros: Record<string, string>;
  totalRegistros: number | null;
  reporte: ReporteConfig;
  onDownload: (formato: 'EXCEL' | 'PDF') => void;
}

function PreviewModal({
  open,
  onOpenChange,
  codigo,
  filtros,
  totalRegistros,
  reporte,
  onDownload,
}: PreviewModalProps) {
  const [loading, setLoading] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      // Para el preview, usamos el endpoint de contar que también devuelve info
      await api.post<{ reporte: ReporteConfig; totalRegistros: number }>('/reportes/preview', {
        codigo_reporte: codigo,
        filtros,
      });
      // El preview de datos real se haría con un endpoint dedicado
      // Por ahora mostramos solo el contador
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoading(false);
    }
  }, [codigo, filtros]);

  useEffect(() => {
    if (open) {
      fetchPreview();
    }
  }, [open, fetchPreview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa: {reporte.nombre}</DialogTitle>
          <DialogDescription>
            {totalRegistros !== null && (
              <>Mostrando vista previa de {totalRegistros.toLocaleString()} registros</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileSpreadsheet className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {totalRegistros?.toLocaleString() || 0} registros listos para descargar
              </p>
              <p className="text-sm">
                Haz clic en uno de los botones de descarga para obtener el reporte completo
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {totalRegistros?.toLocaleString() || 0} registros totales
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {reporte.formatos.includes('excel') && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onOpenChange(false);
                  onDownload('EXCEL');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Excel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
