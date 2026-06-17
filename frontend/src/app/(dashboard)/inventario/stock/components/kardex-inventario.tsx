'use client';

import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMovimientos } from '../../movimientos/hooks/use-movimientos';
import { MovimientosTable } from '../../movimientos/components/movimientos-table';
import { useInventarioSelects } from '../../shared/use-inventario-selects';
import { TIPO_MOVIMIENTO_LABELS } from '@/types/inventario';
import type { DireccionMovimiento } from '../../movimientos/hooks/use-movimientos';

const DIRECCIONES: { value: DireccionMovimiento; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ENTRADAS', label: '↑ Entradas' },
  { value: 'SALIDAS', label: '↓ Salidas' },
];

interface Props {
  /** Si se provee, el código de cada movimiento abre el detalle del ítem. */
  onVerItem?: (itemId: number) => void;
}

export function KardexInventario({ onVerItem }: Props) {
  const {
    movimientos,
    meta,
    resumen,
    loading,
    descargando,
    page,
    setPage,
    filters,
    setFilters,
    descargar,
  } = useMovimientos();
  const { tipos } = useInventarioSelects();

  const entradas = resumen.ENTRADA + resumen.DEVOLUCION;
  const salidas = resumen.ENTREGA + resumen.BAJA;
  const enUso = resumen.ENTREGA - resumen.DEVOLUCION;
  const neto = entradas - salidas;

  const hayFiltros =
    filters.direccion !== 'TODOS' ||
    filters.tipo_movimiento !== 'TODOS' ||
    filters.tipo_uniforme_id !== 'TODOS' ||
    filters.desde ||
    filters.hasta;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-bold">Movimientos (Kardex)</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Todo lo que entró y salió del stock
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={descargar}
          disabled={descargando || meta.total === 0}
        >
          {descargando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Exportar Excel
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border-l-4 border-emerald-500 bg-card p-3 shadow-sm">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUp className="h-3 w-3" /> Entradas
          </p>
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">{entradas}</p>
          <p className="text-[11px] text-muted-foreground">
            compras {resumen.ENTRADA} · devoluciones {resumen.DEVOLUCION}
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-rose-500 bg-card p-3 shadow-sm">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDown className="h-3 w-3" /> Salidas
          </p>
          <p className="text-2xl font-bold text-rose-600 tabular-nums">{salidas}</p>
          <p className="text-[11px] text-muted-foreground">
            entregas {resumen.ENTREGA} · bajas {resumen.BAJA}
          </p>
        </div>
        <div className="rounded-xl border-l-4 border-blue-500 bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Entregadas (en uso)</p>
          <p className="text-2xl font-bold text-blue-600 tabular-nums">{enUso}</p>
          <p className="text-[11px] text-muted-foreground">entregas − devoluciones</p>
        </div>
        <div className="rounded-xl border-l-4 border-slate-400 bg-card p-3 shadow-sm">
          <p className="text-xs text-muted-foreground">Movimiento neto</p>
          <p className="text-2xl font-bold tabular-nums">{neto}</p>
          <p className="text-[11px] text-muted-foreground">entradas − salidas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Dirección</Label>
          <div className="inline-flex overflow-hidden rounded-md border bg-background">
            {DIRECCIONES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setFilters({ ...filters, direccion: d.value })}
                className={cn(
                  'px-3 py-1.5 text-sm',
                  filters.direccion !== d.value &&
                    'border-l first:border-l-0 hover:bg-muted',
                  filters.direccion === d.value &&
                    'border-l first:border-l-0 bg-primary text-primary-foreground',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select
            value={String(filters.tipo_movimiento)}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                tipo_movimiento: v as typeof filters.tipo_movimiento,
              })
            }
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Tipo de movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los tipos</SelectItem>
              {Object.entries(TIPO_MOVIMIENTO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Prenda</Label>
          <Select
            value={String(filters.tipo_uniforme_id)}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                tipo_uniforme_id: v === 'TODOS' ? 'TODOS' : Number(v),
              })
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Prenda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas las prendas</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kardex-desde" className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id="kardex-desde"
            type="date"
            className="w-full sm:w-40"
            value={filters.desde}
            max={filters.hasta || undefined}
            onChange={(e) => setFilters({ ...filters, desde: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kardex-hasta" className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id="kardex-hasta"
            type="date"
            className="w-full sm:w-40"
            value={filters.hasta}
            min={filters.desde || undefined}
            onChange={(e) => setFilters({ ...filters, hasta: e.target.value })}
          />
        </div>

        {hayFiltros && (
          <Button
            variant="ghost"
            className="sm:mb-0.5"
            onClick={() =>
              setFilters({
                direccion: 'TODOS',
                tipo_movimiento: 'TODOS',
                tipo_uniforme_id: 'TODOS',
                desde: '',
                hasta: '',
              })
            }
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MovimientosTable movimientos={movimientos} onVerItem={onVerItem} />
      )}

      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {movimientos.length} de {meta.total} movimientos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
