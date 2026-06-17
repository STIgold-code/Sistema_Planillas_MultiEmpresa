'use client';

import { Pencil, Trash2, Shirt } from 'lucide-react';
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
import { GENERO_LABELS, type TipoUniforme } from '@/types/inventario';

interface Props {
  tipos: TipoUniforme[];
  onEdit: (tipo: TipoUniforme) => void;
  onToggleActivo: (id: number) => void;
  onDelete: (tipo: TipoUniforme) => void;
}

function formatPrecio(precio?: number | string | null): string {
  if (precio === null || precio === undefined || precio === '') return '—';
  return `S/ ${Number(precio).toFixed(2)}`;
}

export function TiposUniformeTable({
  tipos,
  onEdit,
  onToggleActivo,
  onDelete,
}: Props) {
  if (tipos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Shirt className="h-10 w-10 opacity-40" />
        <p className="text-sm">No hay tipos de uniforme registrados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Nombre</TableHead>
            <TableHead className="min-w-[110px]">Género</TableHead>
            <TableHead className="min-w-[90px] text-center">Cant. est.</TableHead>
            <TableHead className="min-w-[110px]">Precio ref.</TableHead>
            <TableHead className="min-w-[90px] text-center">Activo</TableHead>
            <TableHead className="min-w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tipos.map((tipo) => (
            <TableRow key={tipo.id} className={tipo.activo ? '' : 'opacity-60'}>
              <TableCell>
                <p className="font-medium text-sm">{tipo.nombre}</p>
                {tipo.descripcion && (
                  <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                    {tipo.descripcion}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {GENERO_LABELS[tipo.genero]}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-sm tabular-nums">
                {tipo.cantidad_estandar}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {formatPrecio(tipo.precio_referencial)}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={tipo.activo}
                  onCheckedChange={() => onToggleActivo(tipo.id)}
                  aria-label="Activar/desactivar"
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(tipo)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(tipo)}
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
