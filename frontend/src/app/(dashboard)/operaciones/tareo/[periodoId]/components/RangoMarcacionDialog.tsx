'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { TipoMarcacion } from '@/types';
import type { RangoRectangular } from '../useTareoDetalle';

interface RangoMarcacionDialogProps {
  open: boolean;
  rangoSeleccionado: RangoRectangular | null;
  tiposMarcacion: TipoMarcacion[];
  onAplicar: (tipoId: number | null) => void;
  onCancelar: () => void;
}

export function RangoMarcacionDialog({
  open,
  rangoSeleccionado,
  tiposMarcacion,
  onAplicar,
  onCancelar,
}: RangoMarcacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancelar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Aplicar marcación al rango</DialogTitle>
          <DialogDescription className="text-sm">
            {rangoSeleccionado && (() => {
              const numEmpleados = rangoSeleccionado.empleadoIndexFin - rangoSeleccionado.empleadoIndexInicio + 1;
              const numDias = rangoSeleccionado.diaFin - rangoSeleccionado.diaInicio + 1;
              const totalCeldas = numEmpleados * numDias;
              return (
                <>
                  <span className="font-medium">{numEmpleados} empleados</span> × <span className="font-medium">{numDias} días</span>
                  {' '}(Días {rangoSeleccionado.diaInicio} al {rangoSeleccionado.diaFin})
                  <br />
                  <span className="text-blue-600 font-semibold">Total: {totalCeldas} celdas</span>
                </>
              );
            })()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 py-4">
          {tiposMarcacion.map(tipo => (
            <button
              key={tipo.id}
              className="p-2 text-sm font-medium rounded hover:opacity-80 transition-opacity flex flex-col items-center gap-1"
              style={{ backgroundColor: `${tipo.color}30`, color: tipo.color }}
              onClick={() => onAplicar(tipo.id)}
              title={tipo.descripcion}
            >
              <span className="text-lg">{tipo.codigo}</span>
              <span className="text-[10px] opacity-75 truncate w-full text-center">{tipo.descripcion}</span>
            </button>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancelar} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => onAplicar(null)} className="w-full sm:w-auto">
            Limpiar rango
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
