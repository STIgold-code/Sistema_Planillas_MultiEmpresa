'use client';

import { Pencil, Trash2, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Caracteristica } from '@/types/inventario';

interface Props {
  caracteristicas: Caracteristica[];
  onEdit: (c: Caracteristica) => void;
  onToggleActivo: (id: number) => void;
  onDelete: (c: Caracteristica) => void;
}

export function CaracteristicasTable({
  caracteristicas,
  onEdit,
  onToggleActivo,
  onDelete,
}: Props) {
  if (caracteristicas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Tag className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay características registradas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Nombre</TableHead>
            <TableHead className="min-w-[280px]">Descripción</TableHead>
            <TableHead className="min-w-[110px] text-center">
              En uso
            </TableHead>
            <TableHead className="min-w-[90px] text-center">Activo</TableHead>
            <TableHead className="min-w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {caracteristicas.map((c) => (
            <TableRow key={c.id} className={c.activo ? '' : 'opacity-60'}>
              <TableCell>
                <p className="font-medium text-sm">{c.nombre}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.descripcion || '—'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs">
                  {c._count?.tipos_uniforme ?? 0} prendas
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={c.activo}
                  onCheckedChange={() => onToggleActivo(c.id)}
                  aria-label="Activar/desactivar"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(c)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(c)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
