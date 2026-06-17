'use client';

import { useState } from 'react';
import { Plus, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { usePlantillasUniforme } from './hooks/use-plantillas-uniforme';
import { PlantillasTable } from './components/plantillas-table';
import { PlantillaDialog } from './components/plantilla-dialog';
import type { PlantillaUniforme } from '@/types/inventario';

export default function PlantillasUniformePage() {
  const { plantillas, loading, saving, crear, actualizar, eliminar } =
    usePlantillasUniforme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<PlantillaUniforme | null>(null);
  const [aEliminar, setAEliminar] = useState<PlantillaUniforme | null>(null);

  const abrirCrear = () => {
    setEditando(null);
    setDialogOpen(true);
  };
  const abrirEditar = (p: PlantillaUniforme) => {
    setEditando(p);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Plantillas de uniforme</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              El &quot;uniforme completo&quot; que se aplica al cargar un empleado
            </p>
          </div>
        </div>
        <Button onClick={abrirCrear} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PlantillasTable
          plantillas={plantillas}
          onEdit={abrirEditar}
          onDelete={setAEliminar}
        />
      )}

      <PlantillaDialog
        key={`${editando?.id ?? 'nuevo'}-${dialogOpen}`}
        open={dialogOpen}
        plantilla={editando}
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
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar &quot;{aEliminar?.nombre}&quot;?
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
