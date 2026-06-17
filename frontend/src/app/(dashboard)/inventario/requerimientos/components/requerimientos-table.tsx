'use client';

import Link from 'next/link';
import { ClipboardList, Eye } from 'lucide-react';
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
  ESTADO_REQUERIMIENTO_LABELS,
  type Requerimiento,
  type EstadoRequerimiento,
} from '@/types/inventario';

interface Props {
  requerimientos: Requerimiento[];
}

const ESTADO_BADGE: Record<EstadoRequerimiento, string> = {
  BORRADOR: 'bg-amber-100 text-amber-800 border-amber-200',
  APROBADO: 'bg-green-100 text-green-800 border-green-200',
  FINALIZADO: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function RequerimientosTable({ requerimientos }: Props) {
  if (requerimientos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay requerimientos creados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Nombre</TableHead>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[90px] text-center">Líneas</TableHead>
            <TableHead className="min-w-[110px]">Estado</TableHead>
            <TableHead className="min-w-[80px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requerimientos.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm font-medium">{r.nombre}</TableCell>
              <TableCell className="text-sm">{formatDateSafe(r.fecha)}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="tabular-nums">
                  {r._count?.detalles ?? 0}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${ESTADO_BADGE[r.estado]}`}>
                  {ESTADO_REQUERIMIENTO_LABELS[r.estado]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <Link href={`/inventario/requerimientos/${r.id}`} aria-label="Abrir">
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
