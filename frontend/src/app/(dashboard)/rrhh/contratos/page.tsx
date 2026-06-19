'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Contrato, EstadoContrato, ContratoResumen } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Search,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { cn, formatDateSafe } from '@/lib/utils';

interface ContratosResponse {
  data: Contrato[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const estadoBadgeVariant: Record<EstadoContrato, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  PENDIENTE: 'secondary',
  RENOVADO: 'secondary',
  CESADO: 'destructive',
  ANULADO: 'outline',
};

const estadoBadgeClass: Record<EstadoContrato, string> = {
  ACTIVO: '',
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80',
  RENOVADO: '',
  CESADO: '',
  ANULADO: 'bg-red-50 text-red-700 border-red-200 line-through hover:bg-red-50/80',
};

const estadoLabels: Record<EstadoContrato, string> = {
  ACTIVO: 'Activo',
  PENDIENTE: 'Pendiente',
  RENOVADO: 'Renovado',
  CESADO: 'Cesado',
  ANULADO: 'Anulado',
};

const tipoContratoLabels: Record<string, string> = {
  SUJETO_A_MODALIDAD: 'Sujeto a Modalidad',
  INDEFINIDO: 'Indefinido',
  LOCACION: 'Locación de Servicios',
  OBRA_SERVICIO: 'Obra o Servicio',
  TIEMPO_PARCIAL: 'Tiempo Parcial',
};

export default function ContratosPage() {
  const router = useRouter();
  const { getFilter, setFilter, setFilters, clearFilters, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [resumen, setResumen] = useState<ContratoResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [orden, setOrden] = useState<'desc' | 'asc'>('desc'); // desc = más recientes, asc = más antiguos

  const fetchContratos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const estado = getFilter('estado');
      const tipoContrato = getFilter('tipo_contrato');
      const porVencer = getFilter('por_vencer');
      const fechaDesde = getFilter('fecha_desde');
      const fechaHasta = getFilter('fecha_hasta');
      if (buscar) params.append('buscar', buscar);
      if (estado) params.append('estado', estado);
      if (tipoContrato) params.append('tipo_contrato', tipoContrato);
      if (porVencer === 'true') params.append('por_vencer', 'true');
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      params.append('orden', orden);

      const response = await api.get<ContratosResponse>(`/contratos?${params.toString()}`);
      setContratos(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      toast.error('Error al cargar los contratos');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async () => {
    try {
      const data = await api.get<ContratoResumen>('/contratos/resumen');
      setResumen(data);
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchContratos(); }, [filterParams, orden]);

  const handleExportExcel = async () => {
    try {
      toast.info('Generando archivo Excel...');

      // Llamar al endpoint del backend que exporta TODOS los contratos
      const response = await api.getBlob('/contratos/exportar/excel');

      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contratos_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Archivo Excel exportado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al exportar el archivo Excel');
    }
  };

  const getDiasRestantes = (fechaFin: string | undefined) => {
    if (!fechaFin) return null;
    // Parsear la fecha como fecha local (no UTC) para evitar desfase de zona horaria
    const [year, month, day] = fechaFin.split('T')[0].split('-').map(Number);
    const fechaFinLocal = new Date(year, month - 1, day);
    const hoy = startOfDay(new Date());
    const dias = differenceInDays(fechaFinLocal, hoy);
    return dias;
  };

  const getNombreCompleto = (empleado: Contrato['empleado']) => {
    if (!empleado) return '-';
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Vista general de todos los contratos laborales</p>
        </div>
        <Button variant="outline" onClick={handleExportExcel} disabled={contratos.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      {resumen && (
        <div className="grid gap-2 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ estado: 'ACTIVO', por_vencer: '' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">{resumen.vigentes}</div>
              <p className="text-xs text-muted-foreground mt-1">Contratos activos</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ por_vencer: 'true', estado: '' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-yellow-600">{resumen.por_vencer}</div>
              <p className="text-xs text-muted-foreground mt-1">Vencen en 30 dias</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ estado: 'PENDIENTE', por_vencer: '' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-red-600">{resumen.vencidos}</div>
              <p className="text-xs text-muted-foreground mt-1">Requieren accion</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { clearFilters(); setBuscarInput(''); }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{resumen.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Todos los contratos</p>
            </CardContent>
          </Card>
          {resumen.empleados_baja > 0 && (
            <Card className="border-rose-200 bg-rose-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empleados Cesados</CardTitle>
                <XCircle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-rose-600">{resumen.empleados_baja}</div>
                <p className="text-xs text-muted-foreground mt-1">Estado BAJA</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, nombre o DNI..."
                value={buscarInput}
                onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
                className="pl-10 h-10 md:h-11"
              />
            </div>
            <Select value={getFilter('estado')} onValueChange={(v) => setFilters({ estado: v, por_vencer: '' })}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVO">Vigente</SelectItem>
                <SelectItem value="PENDIENTE">Vencido</SelectItem>
                <SelectItem value="RENOVADO">Renovado</SelectItem>
                <SelectItem value="CESADO">Terminado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={getFilter('tipo_contrato')} onValueChange={(v) => setFilter('tipo_contrato', v)}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Tipo contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="SUJETO_A_MODALIDAD">Sujeto a Modalidad</SelectItem>
                <SelectItem value="INDEFINIDO">Indefinido</SelectItem>
                <SelectItem value="LOCACION">Locacion de Servicios</SelectItem>
                <SelectItem value="OBRA_SERVICIO">Obra o Servicio</SelectItem>
                <SelectItem value="TIEMPO_PARCIAL">Tiempo Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-3">
            <Input
              type="date"
              value={getFilter('fecha_desde')}
              onChange={(e) => setFilter('fecha_desde', e.target.value)}
              className="h-10 md:h-11"
              placeholder="Desde"
              title="Fecha inicio desde"
            />
            <Input
              type="date"
              value={getFilter('fecha_hasta')}
              onChange={(e) => setFilter('fecha_hasta', e.target.value)}
              className="h-10 md:h-11"
              placeholder="Hasta"
              title="Fecha inicio hasta"
            />
            {(getFilter('buscar') || getFilter('estado') || getFilter('tipo_contrato') || getFilter('por_vencer') === 'true' || getFilter('fecha_desde') || getFilter('fecha_hasta')) && (
              <Button variant="ghost" onClick={() => { clearFilters(); setBuscarInput(''); }} className="w-full sm:w-auto">
                Limpiar filtros
              </Button>
            )}
          </div>
          {/* Toggle de ordenamiento */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Ordenar por fecha:</span>
            <div className="flex rounded-md border">
              <Button
                variant={orden === 'desc' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setOrden('desc')}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                Recientes
              </Button>
              <Button
                variant={orden === 'asc' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none border-l"
                onClick={() => setOrden('asc')}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Antiguos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de filtro por vencer */}
      {getFilter('por_vencer') === 'true' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Mostrando contratos que vencen en los proximos 30 dias</span>
          <Button variant="ghost" size="sm" onClick={() => setFilter('por_vencer', '')}>
            Quitar filtro
          </Button>
        </div>
      )}

      {/* Tabla */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[70px] text-center bg-slate-100">ID</TableHead>
                <TableHead className="min-w-[150px]">Empleado</TableHead>
                <TableHead className="min-w-[100px]">DNI</TableHead>
                <TableHead className="min-w-[150px]">Tipo Contrato</TableHead>
                <TableHead className="min-w-[150px]">Fecha Inicio</TableHead>
                <TableHead className="min-w-[150px]">Fecha Fin</TableHead>
                <TableHead className="min-w-[150px]">Dias Rest.</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="min-w-[100px]">Fecha Cese</TableHead>
                <TableHead className="min-w-[80px] text-center">Nº Renov.</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : contratos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No se encontraron contratos con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                contratos.map((contrato) => {
                  const diasRestantes = getDiasRestantes(contrato.fecha_fin);
                  return (
                    <TableRow key={contrato.id}>
                      <TableCell className="font-mono text-sm text-center text-slate-700 font-semibold bg-slate-100">
                        {contrato.empleado_id}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {getNombreCompleto(contrato.empleado)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {contrato.empleado?.numero_documento || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tipoContratoLabels[contrato.tipo_contrato] || contrato.tipo_contrato}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateSafe(contrato.fecha_inicio)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contrato.fecha_fin
                          ? formatDateSafe(contrato.fecha_fin)
                          : 'Indefinido'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contrato.estado === 'CESADO' ? (
                          '-'
                        ) : diasRestantes !== null ? (
                          <span
                            className={`font-medium ${
                              diasRestantes <= 0
                                ? 'text-red-600'
                                : diasRestantes <= 30
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {`${diasRestantes} días`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant={estadoBadgeVariant[contrato.estado]} className={cn(estadoBadgeClass[contrato.estado])}>
                          {estadoLabels[contrato.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {contrato.estado === 'CESADO' && contrato.empleado?.movimientos?.[0]?.fecha_movimiento
                          ? formatDateSafe(contrato.empleado.movimientos[0].fecha_movimiento)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-center font-medium">
                        {contrato.numero_renovacion || 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/rrhh/contratos/${contrato.id}`)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/rrhh/empleados/${contrato.empleado_id}`)}
                            title="Ir a ficha del empleado"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginacion */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {contratos.length} de {meta.total} contratos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
