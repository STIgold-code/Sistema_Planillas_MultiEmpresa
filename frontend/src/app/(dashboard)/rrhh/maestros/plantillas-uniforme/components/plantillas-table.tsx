'use client';

import { Shirt, Pencil, Trash2, Star } from 'lucide-react';
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
import type { PlantillaUniforme } from '@/types/inventario';

interface Props {
  plantillas: PlantillaUniforme[];
  onEdit: (p: PlantillaUniforme) => void;
  onDelete: (p: PlantillaUniforme) => void;
}

export function PlantillasTable({ plantillas, onEdit, onDelete }: Props) {
  if (plantillas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Shirt className="h-10 w-10 opacity-40" />
        <p className="text-sm">
          No hay plantillas. Crea el &quot;Uniforme completo&quot; para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Plantilla</TableHead>
            <TableHead className="min-w-[320px]">Artículos</TableHead>
            <TableHead className="min-w-[90px] text-center">Unidades</TableHead>
            <TableHead className="min-w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plantillas.map((p) => {
            const unidades = p.items.reduce((acc, i) => acc + i.cantidad, 0);
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {p.nombre}
                    {p.predeterminada && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]"
                      >
                        <Star className="mr-0.5 h-2.5 w-2.5 fill-indigo-700" />
                        Predeterminada
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.items
                    .map((i) => `${i.tipo_uniforme.nombre} ×${i.cantidad}`)
                    .join(' · ')}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="tabular-nums">
                    {unidades}
                  </Badge>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
