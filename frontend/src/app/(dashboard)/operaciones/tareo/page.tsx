'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe, formatDateSafeLocale } from '@/lib/utils';
import { PeriodoTareo, EstadoPeriodoTareo } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Calendar, Eye, Loader2, Play, Lock, Unlock, MoreVertical, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';

interface PeriodosResponse {
  data: PeriodoTareo[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const estadoBadgeVariant: Record<EstadoPeriodoTareo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BORRADOR: 'outline',
  EN_PROCESO: 'secondary',
  CERRADO: 'default',
  ANULADO: 'destructive',
};

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function TareoPage() {
  const router = useRouter();
  const [periodos, setPeriodos] = useState<PeriodoTareo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear().toString());
  const [selectedMes, setSelectedMes] = useState((new Date().getMonth() + 1).toString());
  const [periodoAEliminar, setPeriodoAEliminar] = useState<PeriodoTareo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchPeriodos = async () => {
    setLoading(true);
    try {
      const response = await api.get<PeriodosResponse>('/tareo/periodos?limit=50');
      setPeriodos(response.data);
    } catch (error) {
      console.error('Error fetching periodos:', error);
      toast.error('Error al cargar los periodos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodos();
  }, []);

  const handleCrear = async () => {
    setSaving(true);
    try {
      await api.post('/tareo/periodos', {
        anio: parseInt(selectedAnio),
        mes: parseInt(selectedMes),
      });
      toast.success('Periodo creado correctamente');
      setDialogOpen(false);
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear el periodo'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerar = async (id: number) => {
    try {
      const result = await api.post<{ message: string; empleados: number }>(`/tareo/periodos/${id}/generar`, {});
      toast.success(result.message);
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar tareos'));
    }
  };

  const handleCerrar = async (id: number) => {
    try {
      await api.post(`/tareo/periodos/${id}/cerrar`, {});
      toast.success('Periodo cerrado correctamente');
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cerrar el periodo'));
    }
  };

  const handleReabrir = async (id: number) => {
    try {
      await api.post(`/tareo/periodos/${id}/reabrir`, {});
      toast.success('Periodo reabierto correctamente');
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al reabrir el periodo'));
    }
  };

  const handleEliminar = async () => {
    if (!periodoAEliminar) return;
    setEliminando(true);
    try {
      const result = await api.delete<{ mensaje: string }>(`/tareo/periodos/${periodoAEliminar.id}`);
      toast.success(result.mensaje);
      setPeriodoAEliminar(null);
      fetchPeriodos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el periodo'));
    } finally {
      setEliminando(false);
    }
  };

  // Generar opciones de años
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Renderizar acciones del periodo (reutilizado en tabla y cards)
  const renderAcciones = (periodo: PeriodoTareo, isMobile = false) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {periodo.estado === 'BORRADOR' && (
              <DropdownMenuItem onClick={() => handleGenerar(periodo.id)}>
                <Play className="mr-2 h-4 w-4" />
                Generar Tareos
              </DropdownMenuItem>
            )}
            {(periodo.estado === 'EN_PROCESO' || periodo.estado === 'CERRADO') && (
              <DropdownMenuItem onClick={() => router.push(`/operaciones/tareo/${periodo.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Grilla
              </DropdownMenuItem>
            )}
            {periodo.estado === 'EN_PROCESO' && (
              <DropdownMenuItem onClick={() => handleCerrar(periodo.id)}>
                <Lock className="mr-2 h-4 w-4" />
                Cerrar Periodo
              </DropdownMenuItem>
            )}
            {periodo.estado === 'CERRADO' && (
              <DropdownMenuItem onClick={() => handleReabrir(periodo.id)}>
                <Unlock className="mr-2 h-4 w-4" />
                Reabrir Periodo
              </DropdownMenuItem>
            )}
            {(periodo.estado === 'BORRADOR' || periodo.estado === 'EN_PROCESO') && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setPeriodoAEliminar(periodo)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {periodo.estado === 'BORRADOR' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerar(periodo.id)}
            title="Generar Tareos"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
        {(periodo.estado === 'EN_PROCESO' || periodo.estado === 'CERRADO') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/operaciones/tareo/${periodo.id}`)}
            title="Ver Grilla"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {periodo.estado === 'EN_PROCESO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCerrar(periodo.id)}
            title="Cerrar Periodo"
          >
            <Lock className="h-4 w-4" />
          </Button>
        )}
        {periodo.estado === 'CERRADO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReabrir(periodo.id)}
            title="Reabrir Periodo"
          >
            <Unlock className="h-4 w-4" />
          </Button>
        )}
        {(periodo.estado === 'BORRADOR' || periodo.estado === 'EN_PROCESO') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPeriodoAEliminar(periodo)}
            title="Eliminar Periodo"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Tareo</h1>
          <p className="text-sm text-muted-foreground">Gestiona la asistencia mensual de los empleados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Periodo
        </Button>
      </div>

      {/* Vista Desktop - Tabla (oculta en móvil) */}
      <div className="flex-1 hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Periodo</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[150px]">Fechas</TableHead>
              <TableHead className="min-w-[150px]">Empleados</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[150px]">Cerrado Por</TableHead>
              <TableHead className="w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : periodos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay periodos creados
                </TableCell>
              </TableRow>
            ) : (
              periodos.map((periodo) => (
                <TableRow key={periodo.id}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {meses[periodo.mes - 1]} {periodo.anio}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDateSafe(periodo.fecha_inicio)} - {formatDateSafe(periodo.fecha_fin)}
                  </TableCell>
                  <TableCell className="text-sm">{periodo._count?.tareos || 0}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={estadoBadgeVariant[periodo.estado]}>{periodo.estado}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {periodo.usuario_cierre?.nombre_completo || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{renderAcciones(periodo)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Móvil - Cards (oculta en desktop) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : periodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No hay periodos creados
          </div>
        ) : (
          periodos.map((periodo) => (
            <div
              key={periodo.id}
              className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Header de la card */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">
                    {meses[periodo.mes - 1]} {periodo.anio}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={estadoBadgeVariant[periodo.estado]}>
                    {periodo.estado === 'CERRADO' && <Lock className="h-3 w-3 mr-1" />}
                    {periodo.estado}
                  </Badge>
                  {renderAcciones(periodo, true)}
                </div>
              </div>

              {/* Info de la card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{periodo._count?.tareos || 0} empleados</span>
                </div>
                <div className="text-muted-foreground text-right">
                  {formatDateSafeLocale(periodo.fecha_inicio, { day: '2-digit', month: 'short' })} - {formatDateSafeLocale(periodo.fecha_fin, { day: '2-digit', month: 'short' })}
                </div>
              </div>

              {/* Footer con usuario de cierre si aplica */}
              {periodo.usuario_cierre && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Cerrado por: {periodo.usuario_cierre.nombre_completo}
                </div>
              )}

              {/* Acción rápida para ver grilla */}
              {(periodo.estado === 'EN_PROCESO' || periodo.estado === 'CERRADO') && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push(`/operaciones/tareo/${periodo.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Grilla
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Nuevo Periodo de Tareo</DialogTitle>
            <DialogDescription className="text-sm">
              Crea un nuevo periodo mensual para registrar la asistencia
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 md:gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Año</label>
              <Select value={selectedAnio} onValueChange={setSelectedAnio}>
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
            <div className="grid gap-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Periodo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!periodoAEliminar} onOpenChange={(open) => !open && setPeriodoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar periodo</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el periodo <strong>{periodoAEliminar && meses[periodoAEliminar.mes - 1]} {periodoAEliminar?.anio}</strong> con{' '}
              <strong>{periodoAEliminar?._count?.tareos || 0} tareos</strong> y todas sus marcaciones.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
