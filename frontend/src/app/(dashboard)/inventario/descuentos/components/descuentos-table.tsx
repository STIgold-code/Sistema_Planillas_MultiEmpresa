'use client';

import { BadgeDollarSign, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateSafe } from '@/lib/utils';
import {
  ESTADO_DESCUENTO_LABELS,
  type SolicitudDescuento,
  type EstadoDescuento,
} from '@/types/inventario';

interface Props {
  descuentos: SolicitudDescuento[];
  onVer: (descuento: SolicitudDescuento) => void;
}

const ESTADO_BADGE: Record<EstadoDescuento, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 border-amber-200',
  APROBADA: 'bg-green-100 text-green-800 border-green-200',
  RECHAZADA: 'bg-red-100 text-red-700 border-red-200',
};

function formatMonto(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return `S/ ${Number(v).toFixed(2)}`;
}

export function DescuentosTable({ descuentos, onVer }: Props) {
  if (descuentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <BadgeDollarSign className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay solicitudes de descuento.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[200px]">Empleado</TableHead>
            <TableHead className="min-w-[80px] text-center">Items</TableHead>
            <TableHead className="min-w-[100px]">Monto</TableHead>
            <TableHead className="min-w-[110px]">Estado</TableHead>
            <TableHead className="min-w-[80px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {descuentos.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="text-sm">{formatDateSafe(d.created_at)}</TableCell>
              <TableCell className="text-sm font-medium">
                {d.empleado.apellido_paterno} {d.empleado.apellido_materno},{' '}
                {d.empleado.nombres}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="tabular-nums">
                  {d.items.length}
                </Badge>
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {formatMonto(d.monto_total)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${ESTADO_BADGE[d.estado]}`}>
                  {ESTADO_DESCUENTO_LABELS[d.estado]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onVer(d)}
                  aria-label="Ver detalle"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
