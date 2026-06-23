'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateSafe, formatDateSafeLocale, parseDateLocal } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Loader2,
  MoreVertical,
  Calendar,
  Plus,
  RefreshCw,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface Periodo {
  id: number;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    fecha_ingreso: string;
    area?: { nombre: string };
  };
  numero_periodo: number;
  fecha_inicio_periodo: string;
  fecha_fin_periodo: string;
  fecha_limite_goce: string;
  dias_correspondientes: number;
  dias_gozados: number;
  dias_vendidos: number;
  dias_pendientes: number;
  estado: string;
  es_triple_vacacional: boolean;
}

interface PeriodosResponse {
  data: Periodo[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Area {
  id: number;
  nombre: string;
}

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACUMULANDO: 'outline',
  DISPONIBLE: 'default',
  PARCIAL: 'secondary',
  GOZADO: 'secondary',
  PENDIENTE: 'destructive',
};

const estadoLabels: Record<string, string> = {
  ACUMULANDO: 'Acumulando',
  DISPONIBLE: 'Disponible',
  PARCIAL: 'Parcialmente gozado',
  GOZADO: 'Gozado',
  PENDIENTE: 'Vencido',
};

export default function PeriodosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertaParam = searchParams.get('alerta');

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('all');
  const [areaId, setAreaId] = useState('all');
  const [soloVencimiento, setSoloVencimiento] = useState(alertaParam === 'vencimiento');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  // Modal de detalle
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null);
  const [empleadoPeriodos, setEmpleadoPeriodos] = useState<Periodo[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Cargar áreas
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const response = await api.get<Area[]>('/masters/areas');
        setAreas(response);
      } catch (error) {
        console.error('Error fetching areas:', error);
      }
    };
    fetchAreas();
  }, []);

  const fetchPeriodos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (buscar) params.append('buscar', buscar);
      if (estado && estado !== 'all') params.append('estado', estado);
      if (areaId && areaId !== 'all') params.append('area_id', areaId);
      if (soloVencimiento) params.append('proximo_vencer', 'true');

      const response = await api.get<PeriodosResponse>(`/vacaciones/periodos?${params}`);
      setPeriodos(response.data);
      setMeta({ total: response.meta.total, totalPages: response.meta.totalPages });
    } catch (error) {
      console.error('Error fetching periodos:', error);
      toast.error('Error al cargar los períodos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodos();
  }, [page, estado, areaId, soloVencimiento]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPeriodos();
  };

  const handleVerDetalle = async (empleadoId: number) => {
    setSelectedEmpleadoId(empleadoId);
    setLoadingDetalle(true);
    try {
      const response = await api.get<{ periodos: Periodo[] }>(`/vacaciones/saldo/${empleadoId}`);
      setEmpleadoPeriodos(response.periodos);
    } catch (error) {
      console.error('Error fetching detalle:', error);
      toast.error('Error al cargar los períodos del empleado');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleGenerarPeriodos = async (empleadoId: number) => {
    try {
      await api.post(`/vacaciones/periodos/generar/${empleadoId}`, {});
      toast.success('Períodos generados correctamente');
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar períodos'));
    }
  };

  const diasHastaVencimiento = (fechaLimite: string) => {
    const hoy = new Date();
    const limite = parseDateLocal(fechaLimite);
    const diff = limite.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Períodos Vacacionales</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Saldos y períodos de vacaciones por empleado
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        <Select value={areaId} onValueChange={(v) => { setAreaId(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="ACUMULANDO">Acumulando</SelectItem>
            <SelectItem value="DISPONIBLE">Disponible</SelectItem>
            <SelectItem value="PARCIAL">Parcialmente gozado</SelectItem>
            <SelectItem value="GOZADO">Gozado</SelectItem>
            <SelectItem value="PENDIENTE">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={soloVencimiento ? 'default' : 'outline'}
          onClick={() => { setSoloVencimiento(!soloVencimiento); setPage(1); }}
          className="whitespace-nowrap"
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Por vencer
        </Button>
      </div>

      {/* Vista Desktop - Tabla */}
      <div className="flex-1 hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Empleado</TableHead>
              <TableHead className="min-w-[100px]">Período</TableHead>
              <TableHead className="min-w-[100px]">Fechas</TableHead>
              <TableHead className="text-center min-w-[150px]">Días</TableHead>
              <TableHead className="min-w-[150px]">Vencimiento</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : periodos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs md:text-sm text-muted-foreground">
                  No hay períodos que mostrar
                </TableCell>
              </TableRow>
            ) : (
              periodos.map((periodo) => {
                const diasVencer = diasHastaVencimiento(periodo.fecha_limite_goce);
                const esUrgente = diasVencer <= 30 && diasVencer > 0 && periodo.dias_pendientes > 0;
                const esVencido = diasVencer <= 0 && periodo.dias_pendientes > 0;

                return (
                  <TableRow
                    key={periodo.id}
                    className={esVencido ? 'bg-red-50 dark:bg-red-950' : esUrgente ? 'bg-yellow-50 dark:bg-yellow-950' : ''}
                  >
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">
                          {periodo.empleado.apellido_paterno} {periodo.empleado.apellido_materno}, {periodo.empleado.nombres}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {periodo.empleado.numero_documento}
                          {periodo.empleado.area && ` - ${periodo.empleado.area.nombre}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">#{periodo.numero_periodo}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-sm">
                        <p>
                          {formatDateSafeLocale(periodo.fecha_inicio_periodo, { day: '2-digit', month: 'short', year: '2-digit' })}
                          {' - '}
                          {formatDateSafeLocale(periodo.fecha_fin_periodo, { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{periodo.dias_pendientes}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          de {periodo.dias_correspondientes}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {esVencido ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Vencido
                          </Badge>
                        ) : esUrgente ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {diasVencer} días
                          </Badge>
                        ) : (
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {formatDateSafe(periodo.fecha_limite_goce)}
                          </span>
                        )}
                        {periodo.es_triple_vacacional && (
                          <Badge variant="destructive">Triple</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={estadoBadgeVariant[periodo.estado]}>
                        {estadoLabels[periodo.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleVerDetalle(periodo.empleado.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver todos los períodos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/rrhh/vacaciones/solicitudes/nueva?empleado=${periodo.empleado.id}`)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva solicitud
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerarPeriodos(periodo.empleado.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerar períodos
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : periodos.length === 0 ? (
          <div className="text-center py-8 text-xs md:text-sm text-muted-foreground border rounded-lg">
            No hay períodos que mostrar
          </div>
        ) : (
          periodos.map((periodo) => {
            const diasVencer = diasHastaVencimiento(periodo.fecha_limite_goce);
            const esUrgente = diasVencer <= 30 && diasVencer > 0 && periodo.dias_pendientes > 0;
            const esVencido = diasVencer <= 0 && periodo.dias_pendientes > 0;

            return (
              <div
                key={periodo.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  esVencido ? 'bg-red-50 dark:bg-red-950 border-red-300' :
                  esUrgente ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300' : 'bg-card'
                }`}
                onClick={() => handleVerDetalle(periodo.empleado.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {periodo.empleado.nombres} {periodo.empleado.apellido_paterno}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {periodo.empleado.numero_documento}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl md:text-2xl font-bold text-primary">{periodo.dias_pendientes}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">dias</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs md:text-sm text-muted-foreground">Periodo #{periodo.numero_periodo}</span>
                  <Badge variant={estadoBadgeVariant[periodo.estado]}>
                    {estadoLabels[periodo.estado]}
                  </Badge>
                </div>

                {(esUrgente || esVencido) && (
                  <div className={`flex items-center gap-2 text-sm ${esVencido ? 'text-red-600' : 'text-yellow-600'}`}>
                    <AlertTriangle className="h-4 w-4" />
                    {esVencido ? 'Período vencido' : `Vence en ${diasVencer} días`}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs md:text-sm text-muted-foreground">
            Mostrando {periodos.length} de {meta.total} períodos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      <Dialog open={selectedEmpleadoId !== null} onOpenChange={() => setSelectedEmpleadoId(null)}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Períodos Vacacionales del Empleado</DialogTitle>
            <DialogDescription className="text-sm">
              Historial completo de períodos y saldos
            </DialogDescription>
          </DialogHeader>
          {loadingDetalle ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {empleadoPeriodos.map((periodo) => (
                <div
                  key={periodo.id}
                  className={`p-4 rounded-lg border ${
                    periodo.es_triple_vacacional ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">Período #{periodo.numero_periodo}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {formatDateSafe(periodo.fecha_inicio_periodo)} -{' '}
                        {formatDateSafe(periodo.fecha_fin_periodo)}
                      </p>
                    </div>
                    <Badge variant={estadoBadgeVariant[periodo.estado]}>
                      {estadoLabels[periodo.estado]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{periodo.dias_correspondientes}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Ganados</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{periodo.dias_gozados}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Gozados</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <p className="text-lg font-bold">{periodo.dias_vendidos}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Vendidos</p>
                    </div>
                    <div className="text-center p-2 bg-primary/10 rounded">
                      <p className="text-lg font-bold text-primary">{periodo.dias_pendientes}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Pendientes</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-xs md:text-sm text-muted-foreground">
                      Vence: {formatDateSafe(periodo.fecha_limite_goce)}
                    </span>
                    {periodo.es_triple_vacacional && (
                      <Badge variant="destructive">Triple Vacacional</Badge>
                    )}
                  </div>
                </div>
              ))}

              {selectedEmpleadoId && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEmpleadoId(null);
                      router.push(`/rrhh/vacaciones/solicitudes/nueva?empleado=${selectedEmpleadoId}`);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Solicitud
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
