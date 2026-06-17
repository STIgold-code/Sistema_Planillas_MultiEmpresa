'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { formatDateSafe, formatDateSafeLocale } from '@/lib/utils';
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
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Eye,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface Solicitud {
  id: number;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    area?: { id: number; nombre: string };
  };
  periodo_vacacional: {
    id: number;
    numero_periodo: number;
    dias_pendientes: number;
  };
  fecha_inicio_solicitada: string;
  fecha_fin_solicitada: string;
  dias_solicitados: number;
  fecha_inicio_aprobada?: string;
  fecha_fin_aprobada?: string;
  dias_aprobados?: number;
  estado: string;
  incluye_venta: boolean;
  dias_venta: number;
  created_at: string;
  creado_por?: { nombre_completo: string };
  aprobado_por_jefe?: { nombre_completo: string };
  aprobado_por_rrhh?: { nombre_completo: string };
}

interface SolicitudesResponse {
  data: Solicitud[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE_JEFE: 'outline',
  PENDIENTE_RRHH: 'secondary',
  APROBADA: 'default',
  EN_GOCE: 'default',
  GOZADA: 'secondary',
  RECHAZADA: 'destructive',
  CANCELADA: 'destructive',
};

const estadoLabels: Record<string, string> = {
  PENDIENTE_JEFE: 'Pendiente Jefe',
  PENDIENTE_RRHH: 'Pendiente RRHH',
  APROBADA: 'Aprobada',
  EN_GOCE: 'En Goce',
  GOZADA: 'Gozada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function SolicitudesPage() {
  const router = useRouter();
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const estado = getFilter('estado');
      const fechaDesde = getFilter('fecha_desde');
      const fechaHasta = getFilter('fecha_hasta');
      if (buscar) params.append('buscar', buscar);
      if (estado) params.append('estado', estado);
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);

      const response = await api.get<SolicitudesResponse>(`/vacaciones/solicitudes?${params}`);
      setSolicitudes(response.data);
      setMeta({ total: response.meta.total, totalPages: response.meta.totalPages });
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
      toast.error('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSolicitudes(); }, [filterParams]);

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Solicitudes de Vacaciones</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las solicitudes de vacaciones de los empleados
          </p>
        </div>
        <Button onClick={() => router.push('/rrhh/vacaciones/solicitudes/nueva')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 md:gap-4">
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={buscarInput}
              onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
              className="pl-10"
            />
          </div>
          <Select value={getFilter('estado')} onValueChange={(v) => setFilter('estado', v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="PENDIENTE_JEFE">Pendiente Jefe</SelectItem>
              <SelectItem value="PENDIENTE_RRHH">Pendiente RRHH</SelectItem>
              <SelectItem value="APROBADA">Aprobada</SelectItem>
              <SelectItem value="EN_GOCE">En Goce</SelectItem>
              <SelectItem value="GOZADA">Gozada</SelectItem>
              <SelectItem value="RECHAZADA">Rechazada</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Rango:</span>
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Input
              type="date"
              placeholder="Desde"
              value={getFilter('fecha_desde')}
              onChange={(e) => setFilter('fecha_desde', e.target.value)}
              className="w-full sm:w-[160px]"
            />
            <Input
              type="date"
              placeholder="Hasta"
              value={getFilter('fecha_hasta')}
              onChange={(e) => setFilter('fecha_hasta', e.target.value)}
              className="w-full sm:w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Vista Desktop - Tabla */}
      <div className="hidden md:block rounded-md border flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Empleado</TableHead>
              <TableHead className="min-w-[200px]">Fechas Solicitadas</TableHead>
              <TableHead className="min-w-[100px]">Días</TableHead>
              <TableHead className="min-w-[100px]">Venta</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : solicitudes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay solicitudes
                </TableCell>
              </TableRow>
            ) : (
              solicitudes.map((solicitud) => (
                <TableRow key={solicitud.id}>
                  <TableCell className="text-sm">
                    <div>
                      <p className="font-medium">
                        {solicitud.empleado.nombres} {solicitud.empleado.apellido_paterno}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {solicitud.empleado.numero_documento}
                        {solicitud.empleado.area && ` - ${solicitud.empleado.area.nombre}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDateSafe(solicitud.fecha_inicio_solicitada)} -{' '}
                        {formatDateSafe(solicitud.fecha_fin_solicitada)}
                      </span>
                    </div>
                    {solicitud.fecha_inicio_aprobada && solicitud.fecha_inicio_aprobada !== solicitud.fecha_inicio_solicitada && (
                      <p className="text-xs text-green-600 mt-1">
                        Aprobado: {formatDateSafe(solicitud.fecha_inicio_aprobada)} -{' '}
                        {formatDateSafe(solicitud.fecha_fin_aprobada)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {solicitud.dias_aprobados && solicitud.dias_aprobados !== solicitud.dias_solicitados ? (
                      <span>
                        <span className="line-through text-muted-foreground">{solicitud.dias_solicitados}</span>{' '}
                        <span className="text-green-600">{solicitud.dias_aprobados}</span>
                      </span>
                    ) : (
                      solicitud.dias_solicitados
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {solicitud.incluye_venta ? (
                      <Badge variant="secondary">{solicitud.dias_venta} días</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={estadoBadgeVariant[solicitud.estado]}>
                      {estadoLabels[solicitud.estado]}
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
                        <DropdownMenuItem
                          onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${solicitud.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        {solicitud.estado === 'PENDIENTE_JEFE' && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${solicitud.id}/aprobar`)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobar (Jefe)
                          </DropdownMenuItem>
                        )}
                        {solicitud.estado === 'PENDIENTE_RRHH' && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${solicitud.id}/validar`)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Validar (RRHH)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No hay solicitudes
          </div>
        ) : (
          solicitudes.map((solicitud) => (
            <div
              key={solicitud.id}
              className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors"
              onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${solicitud.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">
                    {solicitud.empleado.nombres} {solicitud.empleado.apellido_paterno}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {solicitud.empleado.numero_documento}
                  </p>
                </div>
                <Badge variant={estadoBadgeVariant[solicitud.estado]}>
                  {estadoLabels[solicitud.estado]}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{solicitud.dias_solicitados} días</span>
                </div>
                <div className="text-right text-muted-foreground">
                  {formatDateSafeLocale(solicitud.fecha_inicio_solicitada, {
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  -{' '}
                  {formatDateSafeLocale(solicitud.fecha_fin_solicitada, {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              </div>

              {solicitud.incluye_venta && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Incluye venta de {solicitud.dias_venta} días
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {solicitudes.length} de {meta.total} solicitudes
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
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
    </div>
  );
}
