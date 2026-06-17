'use client';

import { ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateSafe, cn } from '@/lib/utils';
import {
  TIPO_MOVIMIENTO_LABELS,
  TIPO_MOVIMIENTO_BADGE,
  ESTADO_ITEM_LABELS,
  type EstadoItemInventario,
  type MovimientoInventario,
} from '@/types/inventario';

interface Props {
  movimientos: MovimientoInventario[];
  /** Si se provee, el código del ítem abre su detalle (Kardex de la unidad). */
  onVerItem?: (itemId: number) => void;
}

const ESTADO_BADGE: Record<EstadoItemInventario, string> = {
  DISPONIBLE: 'bg-green-100 text-green-800 border-green-200',
  ENTREGADO: 'bg-blue-100 text-blue-800 border-blue-200',
  BAJA: 'bg-red-100 text-red-700 border-red-200',
};

function nombreEmpleado(emp: MovimientoInventario['empleado']): string {
  if (!emp) return '';
  return `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`;
}

/** El detalle prioriza el empleado asignado; si no hay, muestra el motivo. */
function detalle(m: MovimientoInventario): string {
  return nombreEmpleado(m.empleado) || m.motivo || '—';
}

function soles(valor: number): string {
  return `S/ ${valor.toFixed(2)}`;
}

export function MovimientosTable({ movimientos, onVerItem }: Props) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <ArrowLeftRight className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay movimientos con estos filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[110px]">Código</TableHead>
            <TableHead className="min-w-[150px]">Prenda</TableHead>
            <TableHead className="min-w-[60px]">Talla</TableHead>
            <TableHead className="min-w-[110px]">Movimiento</TableHead>
            <TableHead className="min-w-[90px] text-right">Entrada S/</TableHead>
            <TableHead className="min-w-[90px] text-right">Salida S/</TableHead>
            <TableHead className="min-w-[110px]">Factura</TableHead>
            <TableHead className="min-w-[110px]">Estado</TableHead>
            <TableHead className="min-w-[180px]">Detalle / Asignado a</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimientos.map((m) => {
            const precio = Number(m.item.precio);
            // Entradas suman al stock (compra a precio; devolución sin costo);
            // salidas restan (entrega/baja al precio de referencia del ítem).
            const entrada =
              m.tipo_movimiento === 'ENTRADA'
                ? precio
                : m.tipo_movimiento === 'DEVOLUCION'
                  ? 0
                  : null;
            const salida =
              m.tipo_movimiento === 'ENTREGA' || m.tipo_movimiento === 'BAJA'
                ? precio
                : null;
            return (
              <TableRow key={m.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDateSafe(m.fecha)}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium">
                  {onVerItem ? (
                    <button
                      type="button"
                      onClick={() => onVerItem(m.item.id)}
                      className="text-primary hover:underline"
                    >
                      {m.item.codigo}
                    </button>
                  ) : (
                    m.item.codigo
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {m.item.tipo_uniforme.nombre}
                </TableCell>
                <TableCell className="text-sm">{m.item.talla}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${TIPO_MOVIMIENTO_BADGE[m.tipo_movimiento]}`}
                  >
                    {TIPO_MOVIMIENTO_LABELS[m.tipo_movimiento]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-green-700">
                  {entrada !== null ? soles(entrada) : ''}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-amber-700">
                  {salida !== null ? soles(salida) : ''}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {m.factura ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', ESTADO_BADGE[m.item.estado])}
                  >
                    {ESTADO_ITEM_LABELS[m.item.estado]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {detalle(m)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
