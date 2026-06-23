'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { cn, toDateString } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/errors';
import { Empleado, Area, Sede } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Loader2,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { differenceInDays, startOfDay } from 'date-fns';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

interface EmpleadosResponse {
  data: Empleado[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  PENDIENTE: 'secondary',
  CESADO: 'destructive',
  REINGRESANTE: 'default',
};

const estadoBadgeClass: Record<string, string> = {
  ACTIVO: '',
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80',
  CESADO: '',
  REINGRESANTE: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100/80',
};

/** Calcula el estado de UI del empleado: REINGRESANTE si es ACTIVO + tiene historia de cese. */
function getEstadoUI(empleado: { estado: string; es_reingresante?: boolean }): string {
  if (empleado.estado === 'ACTIVO' && empleado.es_reingresante) return 'REINGRESANTE';
  return empleado.estado;
}

/** Label visual del estado en espanol. */
function getEstadoLabel(estado: string): string {
  if (estado === 'REINGRESANTE') return 'Reingresante';
  if (estado === 'ACTIVO') return 'Activo';
  if (estado === 'CESADO') return 'Cesado';
  if (estado === 'PENDIENTE') return 'Pendiente';
  return estado;
}

type VinculoLite = NonNullable<Empleado['vinculos_laborales']>[number];

/**
 * Fila de la tabla de empleados. Para REINGRESANTES expandimos a multiples
 * filas: una por vinculo laboral (Req #1). La fila "actual" muestra el
 * vinculo vigente, las filas "historicas" muestran ciclos cerrados con
 * estado CESADO y fecha de cese.
 */
interface EmpleadoFila {
  empleado: Empleado;
  vinculo: VinculoLite | null;
  esHistorica: boolean;
  filaKey: string;
}

function expandEmpleadoParaLista(empleado: Empleado): EmpleadoFila[] {
  const estadoUI = getEstadoUI(empleado);
  if (estadoUI !== 'REINGRESANTE') {
    return [{ empleado, vinculo: null, esHistorica: false, filaKey: String(empleado.id) }];
  }
  const vinculos = empleado.vinculos_laborales ?? [];
  const vinculoActual = vinculos.find((v) => v.fecha_fin === null) ?? null;
  const cerrados = vinculos
    .filter((v) => v.fecha_fin !== null)
    .sort((a, b) => new Date(b.fecha_fin!).getTime() - new Date(a.fecha_fin!).getTime());
  const filas: EmpleadoFila[] = [];
  filas.push({
    empleado,
    vinculo: vinculoActual,
    esHistorica: false,
    filaKey: `${empleado.id}-actual`,
  });
  cerrados.forEach((v) => {
    filas.push({
      empleado,
      vinculo: v,
      esHistorica: true,
      filaKey: `${empleado.id}-vinculo-${v.id}`,
    });
  });
  return filas;
}

export default function EmpleadosPage() {
  const router = useRouter();
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const areaId = getFilter('area_id');
      const sedeId = getFilter('sede_id');
      const estado = getFilter('estado');
      const turno = getFilter('turno');
      const periodo = getFilter('periodo');
      const fechaIngresoDesde = getFilter('fecha_ingreso_desde');
      const fechaIngresoHasta = getFilter('fecha_ingreso_hasta');
      if (buscar) params.append('buscar', buscar);
      if (areaId) params.append('area_id', areaId);
      if (sedeId) params.append('sede_id', sedeId);
      // Filtro REINGRESANTE: estado ACTIVO + flag esReingresante=true
      if (estado === 'REINGRESANTE') {
        params.append('esReingresante', 'true');
      } else if (estado) {
        params.append('estado', estado);
      }
      if (turno) params.append('turno', turno);
      if (periodo) params.append('periodo', periodo);
      if (fechaIngresoDesde) params.append('fecha_ingreso_desde', fechaIngresoDesde);
      if (fechaIngresoHasta) params.append('fecha_ingreso_hasta', fechaIngresoHasta);

      const response = await api.get<EmpleadosResponse>(`/empleados?${params.toString()}`);
      setEmpleados(response.data);
      setMeta(response.meta);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar empleados'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await api.get<Area[]>('/masters/areas');
      setAreas(response);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchSedes = async () => {
    try {
      const response = await api.get<{ data: Sede[] }>('/sedes?limit=100');
      setSedes(response.data);
    } catch (error) {
      console.error('Error fetching sedes:', error);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchSedes();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEmpleados(); }, [filterParams]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      const buscar = getFilter('buscar');
      const areaId = getFilter('area_id');
      const sedeId = getFilter('sede_id');
      const estado = getFilter('estado');
      const turno = getFilter('turno');
      const periodo = getFilter('periodo');
      const fechaIngresoDesde = getFilter('fecha_ingreso_desde');
      const fechaIngresoHasta = getFilter('fecha_ingreso_hasta');
      if (buscar) params.append('buscar', buscar);
      if (areaId) params.append('area_id', areaId);
      if (sedeId) params.append('sede_id', sedeId);
      // Filtro REINGRESANTE: estado ACTIVO + flag esReingresante=true
      if (estado === 'REINGRESANTE') {
        params.append('esReingresante', 'true');
      } else if (estado) {
        params.append('estado', estado);
      }
      if (turno) params.append('turno', turno);
      if (periodo) params.append('periodo', periodo);
      if (fechaIngresoDesde) params.append('fecha_ingreso_desde', fechaIngresoDesde);
      if (fechaIngresoHasta) params.append('fecha_ingreso_hasta', fechaIngresoHasta);

      const blob = await api.getBlob(`/empleados/exportar?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Empleados_${toDateString(new Date())}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Archivo exportado correctamente');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar empleados';
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const getNombreCompleto = (emp: Empleado) => {
    return `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const getDiasRestantes = (fechaFin?: string) => {
    if (!fechaFin) return null;
    const [year, month, day] = fechaFin.split('T')[0].split('-').map(Number);
    const fechaFinLocal = new Date(year, month - 1, day);
    return differenceInDays(fechaFinLocal, startOfDay(new Date()));
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 overflow-hidden">
      {/* Header section - responsive */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Empleados</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestiona los empleados de la empresa</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
          <Button onClick={() => router.push('/rrhh/seleccion/postulantes')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            <span>Agregar via Seleccion</span>
          </Button>
        </div>
      </div>

      {/* Filters Card - responsive grid */}
      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-base md:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, nombre o documento..."
                value={buscarInput}
                onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
                className="h-10 md:h-11 w-full pl-9"
              />
            </div>
            <Select value={getFilter('area_id')} onValueChange={(v) => setFilter('area_id', v)}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()}>
                    {area.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={getFilter('sede_id')} onValueChange={(v) => setFilter('sede_id', v)}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sedes</SelectItem>
                {sedes.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id.toString()}>
                    {sede.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={getFilter('estado')}
              onValueChange={(v) => {
                setFilter('estado', v);
              }}
            >
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="REINGRESANTE">Reingresante</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CESADO">Cesado</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Input
                type="month"
                value={getFilter('periodo')}
                onChange={(e) => setFilter('periodo', e.target.value)}
                disabled={false}
                placeholder="Periodo"
                className="h-10 md:h-11 w-full"
              />
            </div>
            <Select value={getFilter('turno')} onValueChange={(v) => setFilter('turno', v)}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los turnos</SelectItem>
                <SelectItem value="DIA">Día</SelectItem>
                <SelectItem value="NOCHE">Noche</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros de fecha de ingreso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 pt-4 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha Ingreso Desde
              </Label>
              <DatePicker
                date={getFilter('fecha_ingreso_desde') ? new Date(getFilter('fecha_ingreso_desde') + 'T00:00:00') : undefined}
                onSelect={(date) => setFilter('fecha_ingreso_desde', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Seleccionar fecha"
                className="h-10 md:h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Fecha Ingreso Hasta
              </Label>
              <DatePicker
                date={getFilter('fecha_ingreso_hasta') ? new Date(getFilter('fecha_ingreso_hasta') + 'T00:00:00') : undefined}
                onSelect={(date) => setFilter('fecha_ingreso_hasta', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Seleccionar fecha"
                className="h-10 md:h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[70px] text-center bg-slate-100">ID</TableHead>
                  <TableHead className="min-w-[120px]">Documento</TableHead>
                  <TableHead className="min-w-[200px]">Nombre Completo</TableHead>
                  <TableHead className="min-w-[150px]">Área</TableHead>
                  <TableHead className="min-w-[120px]">Sede</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[95px]">F. Inicio</TableHead>
                  <TableHead className="min-w-[95px]">F. Fin</TableHead>
                  <TableHead className="min-w-[80px]">Días Rest.</TableHead>
                  <TableHead className="min-w-[110px]">Fecha Cese</TableHead>
                  <TableHead className="min-w-[130px]">Tipo Cese</TableHead>
                  <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : empleados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <p className="text-sm md:text-base text-muted-foreground">No se encontraron empleados</p>
                      <Button
                        variant="link"
                        onClick={() => router.push('/rrhh/empleados/nuevo')}
                        className="text-sm"
                      >
                        Crear el primer empleado
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  empleados.flatMap(expandEmpleadoParaLista).map((fila) => {
                    const { empleado, vinculo, esHistorica, filaKey } = fila;
                    const estadoUI = esHistorica ? 'CESADO' : getEstadoUI(empleado);
                    const fechaInicioFila = esHistorica && vinculo?.fecha_inicio
                      ? vinculo.fecha_inicio
                      : empleado.contrato_vigente?.fecha_inicio;
                    const fechaFinFila = esHistorica && vinculo?.fecha_fin
                      ? vinculo.fecha_fin
                      : empleado.contrato_vigente?.fecha_fin;
                    const fechaCeseFila = esHistorica ? vinculo?.fecha_fin ?? null : empleado.fecha_cese;
                    const motivoCeseFila = esHistorica ? vinculo?.motivo_cierre ?? null : empleado.tipo_cese?.nombre;
                    return (
                      <TableRow key={filaKey} className={esHistorica ? 'opacity-70 bg-slate-50/70' : ''}>
                        <TableCell className={cn(
                          "font-mono text-sm text-center font-semibold",
                          esHistorica ? "text-slate-400 bg-slate-50" : "text-slate-700 bg-slate-100"
                        )}>
                          {empleado.id}
                        </TableCell>
                        <TableCell className={cn("font-mono text-xs md:text-sm", esHistorica && "text-slate-500")}>
                          {empleado.numero_documento}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            {esHistorica && (
                              <span className="text-xs text-slate-400" title="Ciclo histórico">↳</span>
                            )}
                            <span className={esHistorica ? 'text-slate-500' : ''}>
                              {getNombreCompleto(empleado)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate" title={empleado.area?.nombre}>
                          {esHistorica ? '-' : (empleado.area?.nombre || '-')}
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate" title={empleado.sede?.nombre}>
                          {esHistorica ? '-' : (empleado.sede?.nombre || '-')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={estadoBadgeVariant[estadoUI]} className={cn("text-xs", estadoBadgeClass[estadoUI])}>
                            {getEstadoLabel(estadoUI)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(fechaInicioFila)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(fechaFinFila)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {esHistorica || empleado.estado === 'CESADO' ? '-' : (() => {
                            const contrato = empleado.contrato_vigente;
                            if (!contrato) return '-';
                            const dias = getDiasRestantes(contrato.fecha_fin);
                            if (dias === null) return '-';
                            if (dias < 0) return <span className="text-red-600 font-medium">{dias}</span>;
                            if (dias <= 30) return (
                              <span className="text-yellow-600 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {dias}
                              </span>
                            );
                            return dias;
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fechaCeseFila ? (
                            <span className={esHistorica || empleado.es_reingresante ? 'font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded' : 'text-muted-foreground'}>
                              {formatDate(fechaCeseFila)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm" title={motivoCeseFila ?? undefined}>
                          {motivoCeseFila || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/rrhh/empleados/${empleado.id}`)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver</span>
                            </Button>
                            {!esHistorica && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/rrhh/empleados/${empleado.id}?edit=true`)}
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            )}
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

      {/* Paginación - FUERA del Card, solo si hay más de 1 página */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {empleados.length} de {meta.total} empleados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm whitespace-nowrap">
              Página {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
