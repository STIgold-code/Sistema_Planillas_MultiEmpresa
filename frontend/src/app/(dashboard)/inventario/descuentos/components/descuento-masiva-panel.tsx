'use client';

import { useMemo, useState } from 'react';
import {
  Loader2,
  Search,
  Users,
  Shirt,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  EmpleadoCandidatoDescuento,
  ResultadoDescuentoMasivo,
} from '@/types/inventario';
import { useDescuentoMasiva } from '../hooks/use-descuento-masiva';

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Resalta cada palabra del término dentro del texto. */
function resaltar(texto: string, termino: string): React.ReactNode {
  const palabras = termino.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return texto;
  const re = new RegExp(`(${palabras.map(escaparRegex).join('|')})`, 'gi');
  return texto.split(re).map((parte, i) =>
    palabras.some((p) => p.toLowerCase() === parte.toLowerCase()) ? (
      <mark key={i} className="bg-amber-200 rounded-sm px-0.5">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

const MOTIVO_MINIMO = 5;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras solicitar con éxito para refrescar la lista de descuentos. */
  onSolicitado: () => Promise<void> | void;
}

export function DescuentoMasivaPanel({
  open,
  onOpenChange,
  onSolicitado,
}: Props) {
  const {
    candidatos,
    sedes,
    loading,
    saving,
    page,
    setPage,
    totalPages,
    total,
    filtros,
    setFiltro,
    limpiarFiltros,
    crearMasiva,
    solicitarTodos,
  } = useDescuentoMasiva({ activo: open });

  // Selección por empleado_id. Persiste entre páginas mientras el panel esté abierto.
  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set());
  const [motivo, setMotivo] = useState('');

  // Cierra el panel y reinicia su estado. Se resetea aquí (en el handler de
  // cierre) en lugar de en un efecto: evitamos el setState sincrónico dentro de
  // un useEffect, que dispara renders en cascada (react-hooks/set-state-in-effect).
  const cerrar = () => {
    setSeleccion(new Set());
    setMotivo('');
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) onOpenChange(true);
    else cerrar();
  };

  // Items descontables por empleado, para los contadores globales (incluye
  // empleados de otras páginas ya marcados).
  const descontablesPorEmpleado = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of candidatos) m.set(e.id, e.items_descontables);
    return m;
  }, [candidatos]);

  const toggleEmpleado = (e: EmpleadoCandidatoDescuento, marcar: boolean) => {
    if (e.items_descontables === 0) return;
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (marcar) next.add(e.id);
      else next.delete(e.id);
      return next;
    });
  };

  // Empleados de la página actual que SÍ tienen items por descontar.
  const seleccionablesVisibles = candidatos.filter(
    (e) => e.items_descontables > 0,
  );
  const visiblesMarcados = seleccionablesVisibles.filter((e) =>
    seleccion.has(e.id),
  ).length;
  const todosVisiblesMarcados =
    seleccionablesVisibles.length > 0 &&
    visiblesMarcados === seleccionablesVisibles.length;
  const algunoVisibleMarcado = visiblesMarcados > 0;

  const toggleTodos = (marcar: boolean) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      for (const e of seleccionablesVisibles) {
        if (marcar) next.add(e.id);
        else next.delete(e.id);
      }
      return next;
    });
  };

  // Contadores globales (toda la selección, no solo la página visible). El conteo
  // de items solo cubre a los empleados de la página actual cargada.
  const totalEmpleados = seleccion.size;
  const totalItemsVisibles = useMemo(() => {
    let n = 0;
    seleccion.forEach((empId) => {
      n += descontablesPorEmpleado.get(empId) ?? 0;
    });
    return n;
  }, [seleccion, descontablesPorEmpleado]);

  const motivoValido = motivo.trim().length >= MOTIVO_MINIMO;

  const notificarResultado = (res: ResultadoDescuentoMasivo) => {
    if (res.omitidos.length > 0) {
      toast.warning(
        `Se crearon ${res.creadas} solicitud(es) de descuento. ` +
          `Se omitió a ${res.omitidos.length} empleado(s) sin items por descontar.`,
      );
    } else {
      toast.success(
        `Se crearon ${res.creadas} solicitud(es) de descuento por ${res.total_items} item(s).`,
      );
    }
  };

  const handleSolicitar = async () => {
    if (totalEmpleados === 0 || !motivoValido) return;
    const res = await crearMasiva({
      empleado_ids: [...seleccion],
      motivo: motivo.trim(),
    });
    if (!res) return;
    notificarResultado(res);
    await onSolicitado();
    cerrar();
  };

  const handleSolicitarTodos = async () => {
    if (!motivoValido) return;
    const res = await solicitarTodos(motivo.trim());
    if (!res) return;
    notificarResultado(res);
    await onSolicitado();
    cerrar();
  };

  const puedeSolicitar = totalEmpleados > 0 && motivoValido && !saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle>Solicitar descuento a varios empleados</DialogTitle>
          <DialogDescription>
            Elige los empleados; por cada uno se solicitará el descuento de sus
            uniformes entregados no devueltos. El administrador define el monto al
            aprobar.
          </DialogDescription>
        </DialogHeader>

        {/* Motivo + filtros */}
        <div className="border-b bg-muted/40 px-5 py-3 space-y-3">
          <div className="space-y-1">
            <Label
              htmlFor="motivo-descuento-masivo"
              className="text-xs text-muted-foreground"
            >
              Motivo <span className="text-red-600">*</span> (se aplica a todas
              las solicitudes)
            </Label>
            <Textarea
              id="motivo-descuento-masivo"
              rows={2}
              maxLength={500}
              className="resize-none bg-background"
              placeholder="Ej: empleados cesados que no devolvieron uniformes..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {MOTIVO_MINIMO} caracteres.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-xs text-muted-foreground">
                Buscar (nombre, DNI o cargo)
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 pr-9 h-9"
                  placeholder="Ej: perez juan"
                  value={filtros.buscar}
                  onChange={(e) => setFiltro('buscar', e.target.value)}
                />
                {filtros.buscar && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setFiltro('buscar', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2 sm:pb-1.5">
              <Checkbox
                id="solo-nuevos-descuento"
                checked={filtros.soloNuevos}
                onCheckedChange={(v) => setFiltro('soloNuevos', v === true)}
              />
              <Label
                htmlFor="solo-nuevos-descuento"
                className="text-sm font-normal cursor-pointer"
              >
                Solo nuevos
              </Label>
            </div>
            <div className="min-w-[160px] space-y-1">
              <Label className="text-xs text-muted-foreground">Sede</Label>
              <Select
                value={filtros.sede || 'TODAS'}
                onValueChange={(v) => setFiltro('sede', v === 'TODAS' ? '' : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {sedes.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={limpiarFiltros}
            >
              Limpiar
            </Button>
          </div>
        </div>

        {/* Barra de selección masiva */}
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-5 py-2 text-sm">
          <Checkbox
            aria-label="Seleccionar todos los visibles con items"
            checked={
              todosVisiblesMarcados
                ? true
                : algunoVisibleMarcado
                  ? 'indeterminate'
                  : false
            }
            disabled={seleccionablesVisibles.length === 0}
            onCheckedChange={(v) => toggleTodos(v === true)}
          />
          <span className="text-muted-foreground">
            {loading
              ? 'Buscando…'
              : `${total} empleado${total === 1 ? '' : 's'} · ${visiblesMarcados} marcados en esta página`}
          </span>
        </div>

        {/* Lista compacta */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : candidatos.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Sin empleados para ese filtro.
            </div>
          ) : (
            <ul className="divide-y">
              {candidatos.map((e) => {
                const marcado = seleccion.has(e.id);
                const sinItems = e.items_descontables === 0;
                return (
                  <li
                    key={e.id}
                    className={cn(
                      'flex items-center gap-3 px-5 py-2.5',
                      marcado ? 'bg-primary/5' : 'hover:bg-muted/40',
                      sinItems && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      aria-label={`Seleccionar ${e.apellido_paterno}`}
                      checked={marcado}
                      disabled={sinItems}
                      onCheckedChange={(v) => toggleEmpleado(e, v === true)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {resaltar(
                          `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
                          filtros.buscar,
                        )}
                        {e.estado !== 'ACTIVO' && (
                          <span className="ml-1.5 rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[10px] text-amber-700">
                            {e.estado.charAt(0) + e.estado.slice(1).toLowerCase()}
                          </span>
                        )}
                        {e.es_nuevo && (
                          <span className="ml-1.5 rounded border border-green-200 bg-green-100 px-1 py-0 text-[10px] text-green-700">
                            Nuevo
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground font-mono">
                        {e.numero_documento}
                        {e.sede ? ` · ${e.sede}` : ''}
                        {e.cargo ? ` · ${e.cargo}` : ''}
                      </p>
                    </div>
                    {sinItems ? (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-500 border-slate-200 text-xs"
                      >
                        sin items
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                      >
                        {e.items_descontables} item
                        {e.items_descontables === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t px-5 py-2 text-xs text-muted-foreground">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Vista previa */}
        <div className="border-t bg-emerald-50 px-5 py-2 text-xs text-emerald-800">
          {totalEmpleados === 0 ? (
            <span className="inline-flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
              Selecciona al menos un empleado con items por descontar.
            </span>
          ) : (
            <span>
              Se solicitará descuento a <b>{totalEmpleados}</b> empleado(s) ·{' '}
              <b>{totalItemsVisibles}</b> item(s) en la página actual. Los
              empleados sin items se omiten automáticamente.
            </span>
          )}
        </div>

        {/* Footer: acciones */}
        <div className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1.5">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-primary">{totalEmpleados}</span>
            empleado(s)
            <span className="text-muted-foreground/50">·</span>
            <Shirt className="h-4 w-4" />
            <span className="font-semibold text-foreground">
              {totalItemsVisibles}
            </span>
            item(s)
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={cerrar} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={handleSolicitarTodos}
              disabled={saving || total === 0 || !motivoValido}
              title="Solicita descuento a todos los empleados del filtro con items por descontar"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar a todos
            </Button>
            <Button onClick={handleSolicitar} disabled={!puedeSolicitar}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar seleccionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
