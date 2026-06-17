'use client';

import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PlanificacionCompraLinea } from '@/types/inventario';

interface Props {
  planificacion: PlanificacionCompraLinea[];
  loading: boolean;
}

export function PlanificacionTable({ planificacion, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (planificacion.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4">
        Aún no hay prendas cargadas. Agrega empleados para ver la planificación.
      </p>
    );
  }

  const totalFaltante = planificacion.reduce((acc, p) => acc + p.faltante, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Prenda</TableHead>
            <TableHead className="min-w-[90px]">Talla</TableHead>
            <TableHead className="min-w-[100px] text-right">Requerido</TableHead>
            <TableHead className="min-w-[100px] text-right">Disponible</TableHead>
            <TableHead className="min-w-[100px] text-right">Faltante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planificacion.map((p) => {
            const faltan = p.faltante > 0;
            return (
              <TableRow
                key={`${p.tipo_uniforme_id}-${p.talla}`}
                className={cn(faltan && 'bg-red-50/60')}
              >
                <TableCell
                  className={cn('text-sm', faltan && 'font-semibold text-red-700')}
                >
                  {p.tipo_nombre}
                </TableCell>
                <TableCell
                  className={cn('text-sm', faltan && 'font-semibold text-red-700')}
                >
                  {p.talla}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {p.requerido}
                </TableCell>
                <TableCell className="text-sm text-right tabular-nums">
                  {p.disponible}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-sm text-right tabular-nums',
                    faltan && 'font-bold text-red-700',
                  )}
                >
                  {p.faltante}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="font-bold bg-muted/30">
            <TableCell className="text-sm">TOTAL FALTANTE</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell
              className={cn(
                'text-sm text-right tabular-nums',
                totalFaltante > 0 && 'text-red-700',
              )}
            >
              {totalFaltante}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
