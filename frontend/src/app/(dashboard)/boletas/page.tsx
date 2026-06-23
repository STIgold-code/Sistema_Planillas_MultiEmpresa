'use client';

import { useState, useEffect } from 'react';
import { api, getAccessToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Search,
  RefreshCw,
  Clock,
  Mail,
  Eye,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { RegimenBadge } from '@/components/RegimenBadge';

type EstadoBoleta = 'GENERADA' | 'DESCARGADA' | 'ENVIADA' | 'CONFIRMADA';

interface Boleta {
  id: number;
  anio: number;
  mes: number;
  estado: EstadoBoleta;
  fecha_generacion: string;
  fecha_primera_descarga: string | null;
  fecha_ultimo_acceso: string | null;
  fecha_envio_email: string | null;
  veces_descargada: number;
  empleado: {
    id: number;
    numero_documento: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    area?: { nombre: string };
    cargo?: { nombre: string };
  };
  planilla_detalle: {
    neto_pagar: number;
    total_ingresos: number;
    total_descuentos: number;
    regimen_laboral: string | null;
  };
  generador?: {
    id: number;
    nombre_completo: string;
  };
}

interface BoletasResponse {
  data: Boleta[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Planilla {
  id: number;
  anio: number;
  mes: number;
  estado: string;
  total_empleados: number;
}

interface Estadisticas {
  anio: number;
  total: number;
  porEstado: Record<string, number>;
  porMes: { mes: number; cantidad: number }[];
}

const estadoBadgeVariant: Record<EstadoBoleta, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  GENERADA: 'outline',
  DESCARGADA: 'secondary',
  ENVIADA: 'default',
  CONFIRMADA: 'default',
};

const estadoLabels: Record<EstadoBoleta, string> = {
  GENERADA: 'Generada',
  DESCARGADA: 'Descargada',
  ENVIADA: 'Enviada',
  CONFIRMADA: 'Confirmada',
};

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function BoletasPage() {
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  // Filtros
  const [anioFilter, setAnioFilter] = useState<string>(new Date().getFullYear().toString());
  const [mesFilter, setMesFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [buscar, setBuscar] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Modal generar boletas
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [planillasDisponibles, setPlanillasDisponibles] = useState<Planilla[]>([]);
  const [planillaSeleccionada, setPlanillaSeleccionada] = useState<string>('');
  const [generando, setGenerando] = useState(false);
  const [loadingPlanillas, setLoadingPlanillas] = useState(false);
  const [downloadingMasivo, setDownloadingMasivo] = useState<number | null>(null);

  const fetchBoletas = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (anioFilter) params.append('anio', anioFilter);
      if (mesFilter && mesFilter !== 'all') params.append('mes', mesFilter);
      if (estadoFilter && estadoFilter !== 'all') params.append('estado', estadoFilter);
      if (buscar) params.append('buscar', buscar);

      const response = await api.get<BoletasResponse>(`/boletas?${params.toString()}`);
      setBoletas(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching boletas:', error);
      toast.error('Error al cargar las boletas');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstadisticas = async () => {
    try {
      const data = await api.get<Estadisticas>(`/boletas/estadisticas?anio=${anioFilter}`);
      setEstadisticas(data);
    } catch (error) {
      console.error('Error fetching estadisticas:', error);
    }
  };

  const fetchPlanillasDisponibles = async () => {
    setLoadingPlanillas(true);
    try {
      const response = await api.get<{ data: Planilla[] }>('/planillas?estado=PAGADA&limit=50');
      // También incluir aprobadas
      const response2 = await api.get<{ data: Planilla[] }>('/planillas?estado=APROBADA&limit=50');
      const todas = [...response.data, ...response2.data];
      // Ordenar por año y mes desc
      todas.sort((a, b) => {
        if (b.anio !== a.anio) return b.anio - a.anio;
        return b.mes - a.mes;
      });
      setPlanillasDisponibles(todas);
    } catch (error) {
      console.error('Error fetching planillas:', error);
      toast.error('Error al cargar las planillas');
    } finally {
      setLoadingPlanillas(false);
    }
  };

  useEffect(() => {
    fetchBoletas();
    fetchEstadisticas();
    // Carga inicial al montar; los fetch se recrean en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchBoletas(1);
    fetchEstadisticas();
    // Refetch al cambiar filtros; los fetch se recrean en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioFilter, mesFilter, estadoFilter]);

  const handleSearch = () => {
    fetchBoletas(1);
  };

  const handleDescargarPdf = async (id: number) => {
    setDownloading(id);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boletas/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        },
      });

      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'boleta.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Boleta descargada');
      fetchBoletas(meta.page);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar la boleta');
    } finally {
      setDownloading(null);
    }
  };

  const handleDescargarPdfMasivo = async (planillaId: number) => {
    setDownloadingMasivo(planillaId);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boletas/planilla/${planillaId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al descargar');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const boletasCount = response.headers.get('X-Boletas-Count');
      let filename = 'boletas.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`PDF descargado con ${boletasCount || 'todas las'} boletas`);
    } catch (error) {
      console.error('Error downloading PDF masivo:', error);
      const err = error as { message?: string };
      toast.error(err.message || 'Error al descargar las boletas');
    } finally {
      setDownloadingMasivo(null);
    }
  };

  const handleGenerarBoletas = async () => {
    if (!planillaSeleccionada) {
      toast.error('Selecciona una planilla');
      return;
    }

    setGenerando(true);
    try {
      const result = await api.post<{ mensaje: string; cantidad: number }>('/boletas/generar', {
        planilla_id: parseInt(planillaSeleccionada),
      });
      toast.success(result.mensaje);
      setShowGenerarModal(false);
      setPlanillaSeleccionada('');
      fetchBoletas(1);
      fetchEstadisticas();
    } catch (error: unknown) {
      console.error('Error generando boletas:', error);
      const err = error as { message?: string };
      toast.error(err.message || 'Error al generar boletas');
    } finally {
      setGenerando(false);
    }
  };

  const openGenerarModal = () => {
    setShowGenerarModal(true);
    fetchPlanillasDisponibles();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  };

  return (
    <div className="flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boletas de Pago</h1>
          <p className="text-muted-foreground">
            Historial y gestión de boletas de pago
          </p>
        </div>
        <Button onClick={openGenerarModal}>
          <FileText className="mr-2 h-4 w-4" />
          Generar Boletas
        </Button>
      </div>

      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Boletas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.total}</div>
              <p className="text-xs text-muted-foreground">Año {estadisticas.anio}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.porEstado.GENERADA || 0}</div>
              <p className="text-xs text-muted-foreground">Sin descargar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descargadas</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.porEstado.DESCARGADA || 0}</div>
              <p className="text-xs text-muted-foreground">Por empleados/RRHH</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(estadisticas.porEstado.ENVIADA || 0) + (estadisticas.porEstado.CONFIRMADA || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Por email</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-32">
              <Select value={anioFilter} onValueChange={setAnioFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {meses.map((mes, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="GENERADA">Generada</SelectItem>
                  <SelectItem value="DESCARGADA">Descargada</SelectItem>
                  <SelectItem value="ENVIADA">Enviada</SelectItem>
                  <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => fetchBoletas(1)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="flex-1">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : boletas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron boletas
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descargas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletas.map((boleta) => (
                    <TableRow key={boleta.id}>
                      <TableCell>
                        <span className="font-medium">
                          {meses[boleta.mes - 1]} {boleta.anio}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {boleta.empleado.apellido_paterno} {boleta.empleado.apellido_materno}, {boleta.empleado.nombres}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {boleta.empleado.numero_documento}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RegimenBadge
                          regimen={boleta.planilla_detalle.regimen_laboral}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {boleta.empleado.area?.nombre || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {boleta.empleado.cargo?.nombre || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(boleta.planilla_detalle.neto_pagar))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoBadgeVariant[boleta.estado]}>
                          {estadoLabels[boleta.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{boleta.veces_descargada}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargarPdf(boleta.id)}
                          disabled={downloading === boleta.id}
                        >
                          {downloading === boleta.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((meta.page - 1) * meta.limit) + 1} - {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBoletas(meta.page - 1)}
                      disabled={meta.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Página {meta.page} de {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchBoletas(meta.page + 1)}
                      disabled={meta.page === meta.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Generar Boletas */}
      <Dialog open={showGenerarModal} onOpenChange={setShowGenerarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Boletas de Pago</DialogTitle>
            <DialogDescription>
              Selecciona una planilla aprobada o pagada para generar las boletas de los empleados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loadingPlanillas ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : planillasDisponibles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay planillas aprobadas o pagadas disponibles
              </div>
            ) : (
              <Select value={planillaSeleccionada} onValueChange={setPlanillaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar planilla..." />
                </SelectTrigger>
                <SelectContent>
                  {planillasDisponibles.map((planilla) => (
                    <SelectItem key={planilla.id} value={planilla.id.toString()}>
                      {meses[planilla.mes - 1]} {planilla.anio} - {planilla.estado} ({planilla.total_empleados} empleados)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowGenerarModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => planillaSeleccionada && handleDescargarPdfMasivo(parseInt(planillaSeleccionada))}
              disabled={!planillaSeleccionada || downloadingMasivo !== null}
            >
              {downloadingMasivo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Descargar PDF
            </Button>
            <Button
              onClick={handleGenerarBoletas}
              disabled={!planillaSeleccionada || generando}
            >
              {generando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Boletas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
