'use client';

import { Pencil, Trash2, Truck } from 'lucide-react';
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
import type { Proveedor } from '@/types/inventario';

interface Props {
  proveedores: Proveedor[];
  onEdit: (proveedor: Proveedor) => void;
  onToggleActivo: (id: number) => void;
  onDelete: (proveedor: Proveedor) => void;
}

export function ProveedoresTable({
  proveedores,
  onEdit,
  onToggleActivo,
  onDelete,
}: Props) {
  if (proveedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Truck className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay proveedores registrados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Proveedor</TableHead>
            <TableHead className="min-w-[110px]">RUC</TableHead>
            <TableHead className="min-w-[150px]">Contacto</TableHead>
            <TableHead className="min-w-[120px]">Teléfono</TableHead>
            <TableHead className="min-w-[90px] text-center">Activo</TableHead>
            <TableHead className="min-w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proveedores.map((p) => (
            <TableRow key={p.id} className={p.activo ? '' : 'opacity-60'}>
              <TableCell>
                <p className="font-medium text-sm">{p.nombre}</p>
                {p.email && (
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {p.email}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-sm font-mono">{p.ruc || '—'}</TableCell>
              <TableCell className="text-sm">{p.contacto || '—'}</TableCell>
              <TableCell className="text-sm">{p.telefono || '—'}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={p.activo}
                  onCheckedChange={() => onToggleActivo(p.id)}
                  aria-label="Activar/desactivar"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(p)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(p)}
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
