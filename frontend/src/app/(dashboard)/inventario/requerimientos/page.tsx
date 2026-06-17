'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ESTADO_REQUERIMIENTO_LABELS,
  type EstadoRequerimiento,
} from '@/types/inventario';
import { useRequerimientos } from './hooks/use-requerimientos';
import { RequerimientosTable } from './components/requerimientos-table';
import { CrearRequerimientoDialog } from './components/crear-requerimiento-dialog';

type FiltroEstado = 'TODOS' | EstadoRequerimiento;

const FILTROS: FiltroEstado[] = ['TODOS', 'BORRADOR', 'APROBADO', 'FINALIZADO'];

export default function RequerimientosPage() {
  const router = useRouter();
  const { requerimientos, loading, saving, crear } = useRequerimientos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');

  const conteos = useMemo(() => {
    const acc: Record<FiltroEstado, number> = {
      TODOS: requerimientos.length,
      BORRADOR: 0,
      APROBADO: 0,
      FINALIZADO: 0,
    };
    for (const r of requerimientos) acc[r.estado] += 1;
    return acc;
  }, [requerimientos]);

  const filtrados = useMemo(
    () =>
      filtro === 'TODOS'
        ? requerimientos
        : requerimientos.filter((r) => r.estado === filtro),
    [requerimientos, filtro],
  );

  const handleCrear = async (
    nombre: string,
    fecha: string,
    proveedor_id?: number,
  ) => {
    const nuevo = await crear(nombre, fecha, proveedor_id);
    if (nuevo) {
      router.push(`/inventario/requerimientos/${nuevo.id}`);
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Requerimientos</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Requerimientos de prendas para compra
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo requerimiento
        </Button>
      </div>

      {!loading && requerimientos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filtro === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {f === 'TODOS' ? 'Todos' : ESTADO_REQUERIMIENTO_LABELS[f]}
              <span className="tabular-nums opacity-70">{conteos[f]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <RequerimientosTable requerimientos={filtrados} />
      )}

      <CrearRequerimientoDialog
        open={dialogOpen}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSubmit={handleCrear}
      />
    </div>
  );
}
