'use client';

import { Layers } from 'lucide-react';
import { RegimenBadge } from '@/components/RegimenBadge';
import {
  contarRegimenes,
  tieneVariosRegimenes,
  type FilaConRegimen,
} from '@/lib/regimen-resumen';

interface PlanillaRegimenResumenProps {
  detalles: readonly FilaConRegimen[];
}

/**
 * Resumen de regímenes presentes en la planilla. Solo se renderiza cuando hay
 * MÁS DE UN régimen entre las filas; si todas comparten régimen se omite para
 * no agregar ruido.
 */
export function PlanillaRegimenResumen({
  detalles,
}: PlanillaRegimenResumenProps) {
  if (!tieneVariosRegimenes(detalles)) return null;

  const conteo = contarRegimenes(detalles);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <Layers className="h-4 w-4" aria-hidden="true" />
        Regímenes en esta planilla:
      </span>
      <ul className="flex flex-wrap items-center gap-2" aria-label="Resumen de regímenes">
        {conteo.map((c) => (
          <li key={c.value ?? 'sin-regimen'} className="flex items-center gap-1.5">
            <span className="font-semibold tabular-nums">{c.cantidad}</span>
            {c.value ? (
              <RegimenBadge regimen={c.value} />
            ) : (
              <span className="text-muted-foreground">{c.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
