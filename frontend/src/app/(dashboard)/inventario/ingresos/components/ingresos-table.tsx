'use client';

import { PackagePlus, Eye } from 'lucide-react';
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
import type { IngresoInventario } from '@/types/inventario';

interface Props {
  ingresos: IngresoInventario[];
  onVer: (id: number) => void;
}

export function IngresosTable({ ingresos, onVer }: Props) {
  if (ingresos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <PackagePlus className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay compras registradas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[180px]">Proveedor</TableHead>
            <TableHead className="min-w-[120px]">N° Documento</TableHead>
            <TableHead className="min-w-[90px] text-center">Items</TableHead>
            <TableHead className="min-w-[160px]">Registrado por</TableHead>
            <TableHead className="min-w-[60px] text-right">Ver</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingresos.map((ing) => (
            <TableRow
              key={ing.id}
              onClick={() => onVer(ing.id)}
              className="cursor-pointer"
            >
              <TableCell className="text-sm">
                {formatDateSafe(ing.fecha_ingreso)}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {ing.proveedor.nombre}
              </TableCell>
              <TableCell className="text-sm">
                {ing.numero_documento || '—'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="tabular-nums">
                  {ing._count?.items ?? 0}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {ing.usuario.nombre_completo}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVer(ing.id);
                  }}
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
