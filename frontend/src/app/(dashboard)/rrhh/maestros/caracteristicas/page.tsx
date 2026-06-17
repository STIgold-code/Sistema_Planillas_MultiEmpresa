'use client';

import { useState } from 'react';
import { Plus, Search, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCaracteristicas } from './hooks/use-caracteristicas';
import { CaracteristicasTable } from './components/caracteristicas-table';
import { CaracteristicaDialog } from './components/caracteristica-dialog';
import type { Caracteristica } from '@/types/inventario';

export default function CaracteristicasPage() {
  const {
    caracteristicas,
    loading,
    buscar,
    setBuscar,
    saving,
    crear,
    actualizar,
    toggleActivo,
    eliminar,
  } = useCaracteristicas();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Caracteristica | null>(null);
  const [aEliminar, setAEliminar] = useState<Caracteristica | null>(null);

  const abrirCrear = () => {
    setEditando(null);
    setDialogOpen(true);
  };

  const abrirEditar = (c: Caracteristica) => {
    setEditando(c);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Características</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Atributos descriptivos que se asocian a las prendas (material,
              color, etc.) y salen en el cargo PDF al proveedor.
            </p>
          </div>
        </div>
        <Button onClick={abrirCrear} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva característica
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o descripción..."
          className="pl-9"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CaracteristicasTable
          caracteristicas={caracteristicas}
          onEdit={abrirEditar}
          onToggleActivo={toggleActivo}
          onDelete={setAEliminar}
        />
      )}

      <CaracteristicaDialog
        key={`${editando?.id ?? 'nuevo'}-${dialogOpen}`}
        open={dialogOpen}
        caracteristica={editando}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSubmit={(data) =>
          editando ? actualizar(editando.id, data) : crear(data)
        }
      />

      <AlertDialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar característica</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar &quot;{aEliminar?.nombre}&quot;? Se
              quitará de todas las prendas a las que esté asociada. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (aEliminar) eliminar(aEliminar.id);
                setAEliminar(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
