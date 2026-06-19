'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/utils';
import {
  ESTADO_ITEM_LABELS,
  CONDICION_ITEM_LABELS,
  TIPO_MOVIMIENTO_LABELS,
  type ItemInventarioDetalle,
  type MovimientoItemDetalle,
  type EstadoItemInventario,
} from '@/types/inventario';

interface Props {
  item: ItemInventarioDetalle | null;
  onClose: () => void;
}

const ESTADO_BADGE: Record<EstadoItemInventario, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ENTREGADO: 'bg-blue-100 text-blue-700 border-blue-200',
  BAJA: 'bg-red-100 text-red-700 border-red-200',
};

const PUNTO: Record<MovimientoItemDetalle['tipo_movimiento'], string> = {
  ENTRADA: 'bg-emerald-500',
  ENTREGA: 'bg-blue-500',
  DEVOLUCION: 'bg-amber-500',
  BAJA: 'bg-red-500',
};

const TEXTO: Record<MovimientoItemDetalle['tipo_movimiento'], string> = {
  ENTRADA: 'text-emerald-700',
  ENTREGA: 'text-blue-700',
  DEVOLUCION: 'text-amber-700',
  BAJA: 'text-red-700',
};

function nombreEmpleado(e: MovimientoItemDetalle['empleado']): string | null {
  if (!e) return null;
  return `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`;
}

export function ItemDetalleDialog({ item, onClose }: Props) {
  if (!item) return null;

  return (
    <Dialog open={item !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{item.codigo}</DialogTitle>
          <DialogDescription>
            {item.tipo_uniforme.nombre} · Talla {item.talla}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Estado actual */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`text-xs ${ESTADO_BADGE[item.estado]}`}>
              {ESTADO_ITEM_LABELS[item.estado]}
            </Badge>
            <Badge
              variant="outline"
              className={
                item.condicion === 'USADO'
                  ? 'text-xs bg-amber-100 text-amber-800 border-amber-200'
                  : 'text-xs bg-slate-100 text-slate-700 border-slate-200'
              }
            >
              {CONDICION_ITEM_LABELS[item.condicion]}
            </Badge>
          </div>

          {/* Origen / Compra */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Origen · Compra
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Fecha de ingreso</dt>
                <dd className="font-medium">
                  {item.ingreso ? formatDateSafe(item.ingreso.fecha_ingreso) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">N° Documento</dt>
                <dd className="font-medium">
                  {item.ingreso?.numero_documento || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Proveedor</dt>
                <dd className="font-medium">{item.proveedor.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Precio</dt>
                <dd className="font-medium">S/ {Number(item.precio).toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          {/* Kardex */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Historial de movimientos (Kardex)
            </h3>
            {item.movimientos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Sin movimientos registrados.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-muted pl-5">
                {item.movimientos.map((m) => {
                  const emp = nombreEmpleado(m.empleado);
                  return (
                    <li key={m.id} className="relative">
                      <span
                        className={`absolute -left-[26px] top-0.5 h-4 w-4 rounded-full ring-4 ring-background ${PUNTO[m.tipo_movimiento]}`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${TEXTO[m.tipo_movimiento]}`}>
                          {TIPO_MOVIMIENTO_LABELS[m.tipo_movimiento]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTimeSafe(m.fecha)}
                        </span>
                      </div>
                      {emp && (
                        <p className="text-xs text-foreground">a {emp}</p>
                      )}
                      {m.motivo && (
                        <p className="text-xs text-muted-foreground">{m.motivo}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70">
                        por {m.usuario.nombre_completo}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
