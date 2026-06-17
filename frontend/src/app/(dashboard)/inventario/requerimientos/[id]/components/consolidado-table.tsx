'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ConsolidadoRequerimiento } from '@/types/inventario';

interface Props {
  consolidado: ConsolidadoRequerimiento[];
}

export function ConsolidadoTable({ consolidado }: Props) {
  if (consolidado.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4">
        Aún no hay prendas cargadas. Agrega ítems o empleados para ver el
        consolidado.
      </p>
    );
  }

  const total = consolidado.reduce((acc, c) => acc + c.cantidad, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Prenda</TableHead>
            <TableHead className="min-w-[100px]">Talla</TableHead>
            <TableHead className="min-w-[120px] text-right">Cantidad total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consolidado.map((c) => (
            <TableRow key={`${c.tipo_uniforme_id}-${c.talla}`}>
              <TableCell className="text-sm">{c.tipo_nombre}</TableCell>
              <TableCell className="text-sm">{c.talla}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">{c.cantidad}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/30">
            <TableCell className="text-sm">TOTAL</TableCell>
            <TableCell />
            <TableCell className="text-sm text-right tabular-nums">{total}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
