'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Planilla, EstadoPlanilla, PlanillaResumen } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  Trash2,
  FileSpreadsheet,
  Users,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateSafe } from '@/lib/utils';

interface PlanillasResponse {
  data: Planilla[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const estadoBadgeVariant: Record<EstadoPlanilla, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BORRADOR: 'outline',
  CALCULADA: 'secondary',
  REVISADA: 'secondary',
  APROBADA: 'default',
  PAGADA: 'default',
  ANULADA: 'destructive',
};

const estadoLabels: Record<EstadoPlanilla, string> = {
  BORRADOR: 'Borrador',
  CALCULADA: 'Calculada',
  REVISADA: 'Revisada',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function PlanillasPage() {
  const router = useRouter();
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [resumen, setResumen] = useState<PlanillaResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [anioFilter, setAnioFilter] = useState<string>(new Date().getFullYear().toString());
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Modal nueva planilla
  const [showModal, setShowModal] = useState(false);
  const [nuevoAnio, setNuevoAnio] = useState(new Date().getFullYear());
  const [nuevoMes, setNuevoMes] = useState(new Date().getMonth() + 1);
  const [creating, setCreating] = useState(false);

  // Dialog eliminar
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlanillas = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (anioFilter) params.append('anio', anioFilter);
      if (estadoFilter && estadoFilter !== 'all') params.append('estado', estadoFilter);

      const response = await api.get<PlanillasResponse>(`/planillas?${params.toString()}`);
      setPlanillas(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching planillas:', error);
      toast.error('Error al cargar las planillas');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async () => {
    try {
      const data = await api.get<PlanillaResumen>('/planillas/resumen');
      setResumen(data);
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  useEffect(() => {
    fetchPlanillas();
    fetchResumen();
    // Carga inicial al montar; fetchPlanillas/fetchResumen se recrean en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPlanillas(1);
    // Refetch al cambiar filtros; fetchPlanillas se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioFilter, estadoFilter]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const planilla = await api.post<Planilla>('/planillas', {
        anio: nuevoAnio,
        mes: nuevoMes,
      });
      toast.success('Planilla creada correctamente');
      setShowModal(false);
      router.push(`/planilla/${planilla.id}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear la planilla'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/planillas/${deleteId}`);
      toast.success('Planilla eliminada correctamente');
      fetchPlanillas(meta.page);
      fetchResumen();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la planilla'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Planillas</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestion de planillas de remuneraciones</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Planilla
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      {resumen && (
        <div className="grid gap-2 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Anual {resumen.anio}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(resumen.total_anual)}</div>
              <p className="text-xs md:text-sm text-muted-foreground">
                {resumen.planillas_anio.length} planillas procesadas
              </p>
            </CardContent>
          </Card>
          {resumen.ultima_planilla && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ultima Planilla</CardTitle>
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {meses[resumen.ultima_planilla.mes - 1]} {resumen.ultima_planilla.anio}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {formatCurrency(resumen.ultima_planilla.total_neto)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Empleados</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">{resumen.ultima_planilla.total_empleados}</div>
                  <p className="text-xs md:text-sm text-muted-foreground">en ultima planilla</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge variant={estadoBadgeVariant[resumen.ultima_planilla.estado]}>
                    {estadoLabels[resumen.ultima_planilla.estado]}
                  </Badge>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <Select value={anioFilter} onValueChange={setAnioFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="CALCULADA">Calculada</SelectItem>
            <SelectItem value="REVISADA">Revisada</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="PAGADA">Pagada</SelectItem>
            <SelectItem value="ANULADA">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Periodo</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="text-right min-w-[150px]">Empleados</TableHead>
              <TableHead className="text-right min-w-[150px]">Total Bruto</TableHead>
              <TableHead className="text-right min-w-[150px]">Descuentos</TableHead>
              <TableHead className="text-right min-w-[150px]">Total Neto</TableHead>
              <TableHead className="min-w-[150px]">Generada</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : planillas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs md:text-sm text-muted-foreground">
                  No hay planillas registradas
                </TableCell>
              </TableRow>
            ) : (
              planillas.map((planilla) => (
                <TableRow key={planilla.id}>
                  <TableCell className="font-medium text-sm">
                    {meses[planilla.mes - 1]} {planilla.anio}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={estadoBadgeVariant[planilla.estado]}>
                      {estadoLabels[planilla.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{planilla.total_empleados}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(planilla.total_bruto)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatCurrency(planilla.total_descuentos)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-green-600">
                    {formatCurrency(planilla.total_neto)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {planilla.fecha_generacion
                      ? formatDateSafe(planilla.fecha_generacion)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/planilla/${planilla.id}`)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(planilla.estado === 'BORRADOR' || planilla.estado === 'ANULADA') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(planilla.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
            </div>
          </div>
        </div>

      {/* Paginacion */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs md:text-sm text-muted-foreground">
            Mostrando {planillas.length} de {meta.total} planillas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchPlanillas(meta.page - 1)}
              disabled={meta.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {meta.page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchPlanillas(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Nueva Planilla */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Nueva Planilla</DialogTitle>
            <DialogDescription className="text-sm">
              Seleccione el periodo para crear una nueva planilla
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={nuevoAnio.toString()}
                  onValueChange={(v) => setNuevoAnio(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={nuevoMes.toString()}
                  onValueChange={(v) => setNuevoMes(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Planilla'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Planilla</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta seguro de eliminar esta planilla? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
