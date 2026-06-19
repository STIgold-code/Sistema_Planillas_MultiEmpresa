'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface LineaItemLista {
  tipoId: number;
  tipoNombre: string;
  talla: string;
  cantidad: number;
}

interface Props {
  lineas: LineaItemLista[];
}

/** Tabla read-only de los ítems directos (lista de compra sin empleado). */
export function ItemsLista({ lineas }: Props) {
  if (lineas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        Aún no hay ítems sueltos. Usa &quot;Agregar ítems&quot; para armar la
        lista de compra.
      </p>
    );
  }

  const total = lineas.reduce((acc, l) => acc + l.cantidad, 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Prenda</TableHead>
            <TableHead className="min-w-[100px]">Talla</TableHead>
            <TableHead className="min-w-[120px] text-right">Cantidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineas.map((l, idx) => (
            <TableRow key={`${l.tipoId}-${l.talla}-${idx}`}>
              <TableCell className="text-sm">{l.tipoNombre}</TableCell>
              <TableCell className="text-sm font-mono">{l.talla}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">
                {l.cantidad}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/30">
            <TableCell className="text-sm">TOTAL</TableCell>
            <TableCell />
            <TableCell className="text-sm text-right tabular-nums">
              {total}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
