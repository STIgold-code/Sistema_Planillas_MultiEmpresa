'use client';

import { useState } from 'react';
import { ChevronRight, Loader2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface LineaDetalleEmpleado {
  tipoId: number;
  tipoNombre: string;
  talla: string;
  cantidad: number;
}

export interface EmpleadoAgrupado {
  empleadoId: number;
  nombre: string;
  dni: string;
  lineas: LineaDetalleEmpleado[];
}

interface Props {
  empleado: EmpleadoAgrupado;
  editable: boolean;
  preparando: boolean;
  onEditar: (empleadoId: number, nombre: string) => void;
}

export function EmpleadoDetalleItem({ empleado, editable, preparando, onEditar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const totalPrendas = empleado.lineas.reduce((acc, l) => acc + l.cantidad, 0);

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="border-b last:border-b-0">
      <div className="flex items-center gap-2 py-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left text-sm">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              abierto ? 'rotate-90' : ''
            }`}
          />
          <span className="truncate">
            {empleado.nombre}{' '}
            <span className="text-xs text-muted-foreground font-mono">({empleado.dni})</span>
          </span>
        </CollapsibleTrigger>
        <Badge variant="outline" className="tabular-nums shrink-0">
          {totalPrendas} prendas
        </Badge>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            disabled={preparando}
            onClick={() => onEditar(empleado.empleadoId, empleado.nombre)}
            aria-label={`Editar prendas de ${empleado.nombre}`}
          >
            {preparando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="overflow-x-auto pb-3 pl-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left font-medium py-1 pr-4">Prenda</th>
                <th className="text-left font-medium py-1 pr-4">Talla</th>
                <th className="text-right font-medium py-1">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {empleado.lineas.map((l) => (
                <tr key={l.tipoId} className="border-t">
                  <td className="py-1 pr-4">{l.tipoNombre}</td>
                  <td className="py-1 pr-4 font-mono">{l.talla}</td>
                  <td className="py-1 text-right tabular-nums">{l.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
