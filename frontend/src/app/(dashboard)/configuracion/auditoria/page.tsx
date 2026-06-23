'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye, ChevronLeft, ChevronRight, History, Filter, X, BarChart3, Download } from 'lucide-react';
import Link from 'next/link';
import { getAccessToken } from '@/lib/api';
import { toast } from 'sonner';
import { JsonDiffViewer } from '@/components/auditoria/json-diff-viewer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Usuario {
  id: number;
  nombre_completo: string;
  email: string;
}

interface AuditoriaRecord {
  id: number;
  usuario_id: number;
  usuario: Usuario;
  accion: string;
  tabla_afectada: string;
  registro_id: number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
}

interface PaginatedResponse {
  data: AuditoriaRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ACCIONES = [
  { value: 'CREATE', label: 'Crear', color: 'bg-green-100 text-green-800' },
  { value: 'UPDATE', label: 'Actualizar', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELETE', label: 'Eliminar', color: 'bg-red-100 text-red-800' },
  { value: 'LOGIN', label: 'Iniciar Sesión', color: 'bg-purple-100 text-purple-800' },
  { value: 'LOGOUT', label: 'Cerrar Sesión', color: 'bg-gray-100 text-gray-800' },
  { value: 'CALCULAR', label: 'Calcular', color: 'bg-amber-100 text-amber-800' },
  { value: 'APROBAR', label: 'Aprobar', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'RECHAZAR', label: 'Rechazar', color: 'bg-rose-100 text-rose-800' },
  { value: 'PAGAR', label: 'Pagar', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'ANULAR', label: 'Anular', color: 'bg-orange-100 text-orange-800' },
  { value: 'CERRAR_PERIODO', label: 'Cerrar Período', color: 'bg-slate-100 text-slate-800' },
  { value: 'REABRIR_PERIODO', label: 'Reabrir Período', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'INICIAR_SESION', label: 'Iniciar Sesión Tareo', color: 'bg-violet-100 text-violet-800' },
  { value: 'FINALIZAR_SESION', label: 'Finalizar Sesión Tareo', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'APROBAR_JEFE', label: 'Aprobar (Jefe)', color: 'bg-teal-100 text-teal-800' },
  { value: 'APROBAR_RRHH', label: 'Aprobar (RRHH)', color: 'bg-lime-100 text-lime-800' },
];

const TABLAS = [
  { value: 'empleados', label: 'Empleados' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'planillas', label: 'Planillas' },
  { value: 'periodos_tareo', label: 'Períodos de Tareo' },
  { value: 'sesiones_tareo', label: 'Sesiones de Tareo' },
  { value: 'justificaciones_tareo', label: 'Justificaciones' },
  { value: 'solicitudes_vacaciones', label: 'Vacaciones' },
  { value: 'vacantes', label: 'Vacantes' },
  { value: 'postulantes', label: 'Postulantes' },
  { value: 'users', label: 'Usuarios' },
];

function getAccionBadge(accion: string) {
  const found = ACCIONES.find((a) => a.value === accion);
  return found || { value: accion, label: accion, color: 'bg-gray-100 text-gray-800' };
}

function getTablaLabel(tabla: string) {
  const found = TABLAS.find((t) => t.value === tabla);
  return found?.label || tabla;
}

export default function AuditoriaPage() {
  const [records, setRecords] = useState<AuditoriaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });

  // Filtros
  const [filtroTabla, setFiltroTabla] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [filtroBuscar, setFiltroBuscar] = useState<string>('');

  // Modal de detalle
  const [selectedRecord, setSelectedRecord] = useState<AuditoriaRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');

      if (filtroTabla && filtroTabla !== 'all') params.append('tabla', filtroTabla);
      if (filtroAccion && filtroAccion !== 'all') params.append('accion', filtroAccion);
      if (filtroFechaDesde) params.append('fecha_desde', filtroFechaDesde);
      if (filtroFechaHasta) params.append('fecha_hasta', filtroFechaHasta);
      if (filtroBuscar) params.append('registro_id', filtroBuscar);

      const response = await api.get<PaginatedResponse>(`/auditoria?${params.toString()}`);
      setRecords(response.data || []);
      setMeta(response.meta || { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Error al cargar los registros de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filtroTabla, filtroAccion, filtroFechaDesde, filtroFechaHasta, filtroBuscar]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const openDetail = (record: AuditoriaRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  const clearFilters = () => {
    setFiltroTabla('');
    setFiltroAccion('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroBuscar('');
  };

  const hasFilters = filtroTabla || filtroAccion || filtroFechaDesde || filtroFechaHasta || filtroBuscar;

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filtroTabla && filtroTabla !== 'all') params.append('tabla', filtroTabla);
      if (filtroAccion && filtroAccion !== 'all') params.append('accion', filtroAccion);
      if (filtroFechaDesde) params.append('fecha_desde', filtroFechaDesde);
      if (filtroFechaHasta) params.append('fecha_hasta', filtroFechaHasta);

      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auditoria/exportar?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Archivo exportado correctamente');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar los registros');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Auditoría del Sistema
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Historial de cambios y acciones realizadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {meta.total > 0 && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {meta.total.toLocaleString()} registros
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || records.length === 0}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/configuracion/auditoria/dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-muted/40 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select value={filtroTabla} onValueChange={setFiltroTabla}>
            <SelectTrigger>
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              {TABLAS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroAccion} onValueChange={setFiltroAccion}>
            <SelectTrigger>
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {ACCIONES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Desde"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="h-9"
          />

          <Input
            type="date"
            placeholder="Hasta"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="h-9"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ID registro"
              value={filtroBuscar}
              onChange={(e) => setFiltroBuscar(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Fecha</TableHead>
                  <TableHead className="min-w-[120px]">Usuario</TableHead>
                  <TableHead className="min-w-[100px]">Acción</TableHead>
                  <TableHead className="min-w-[120px]">Módulo</TableHead>
                  <TableHead className="w-[80px]">ID Reg.</TableHead>
                  <TableHead className="w-[80px]">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando registros...</p>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No hay registros de auditoría
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const accion = getAccionBadge(record.accion);
                    return (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(record)}>
                        <TableCell className="text-sm font-mono">
                          {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{record.usuario?.nombre_completo || 'Sistema'}</div>
                          <div className="text-xs text-muted-foreground">{record.usuario?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${accion.color} border-0`}>
                            {accion.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTablaLabel(record.tabla_afectada)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {record.registro_id || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(record); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalle de Auditoría
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* Metadatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Fecha:</span>
                  <p>{format(new Date(selectedRecord.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Usuario:</span>
                  <p>{selectedRecord.usuario?.nombre_completo || 'Sistema'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Acción:</span>
                  <div className="mt-1">
                    <Badge variant="secondary" className={`${getAccionBadge(selectedRecord.accion).color} border-0`}>
                      {getAccionBadge(selectedRecord.accion).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Módulo:</span>
                  <p>{getTablaLabel(selectedRecord.tabla_afectada)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">ID Registro:</span>
                  <p className="font-mono">{selectedRecord.registro_id || '-'}</p>
                </div>
              </div>

              {/* Descripción si existe */}
              {Boolean(selectedRecord.datos_nuevos?._descripcion) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{String(selectedRecord.datos_nuevos?._descripcion)}</p>
                </div>
              )}

              {/* Diff de cambios */}
              {(selectedRecord.datos_anteriores || selectedRecord.datos_nuevos) && (
                <div>
                  <h4 className="font-medium mb-2">Cambios realizados</h4>
                  <JsonDiffViewer
                    before={selectedRecord.datos_anteriores}
                    after={selectedRecord.datos_nuevos}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
