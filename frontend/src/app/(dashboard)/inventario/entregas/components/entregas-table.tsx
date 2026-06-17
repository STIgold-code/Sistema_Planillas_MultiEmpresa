'use client';

import { HandHelping, Eye } from 'lucide-react';
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
import type { EntregaUniforme } from '@/types/inventario';

interface Props {
  entregas: EntregaUniforme[];
  onVer: (id: number) => void;
}

export function EntregasTable({ entregas, onVer }: Props) {
  if (entregas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <HandHelping className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay entregas registradas.</p>
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
            <TableHead className="min-w-[100px]">DNI</TableHead>
            <TableHead className="min-w-[80px] text-center">Items</TableHead>
            <TableHead className="min-w-[160px]">Entregado por</TableHead>
            <TableHead className="min-w-[80px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entregas.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-sm">
                {formatDateSafe(e.fecha_entrega)}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {e.empleado.apellido_paterno} {e.empleado.apellido_materno},{' '}
                {e.empleado.nombres}
              </TableCell>
              <TableCell className="text-sm font-mono">
                {e.empleado.numero_documento}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="tabular-nums">
                  {e._count?.items ?? 0}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {e.entregado_por.nombre_completo}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onVer(e.id)}
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
