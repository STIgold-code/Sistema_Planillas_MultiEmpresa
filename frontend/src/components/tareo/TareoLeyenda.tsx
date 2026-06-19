'use client';

import { useState } from 'react';
import { TipoMarcacion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TareoLeyendaProps {
  tiposMarcacion: TipoMarcacion[];
  className?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}

// Agrupar tipos de marcación por categoría
const CATEGORIAS: Record<string, { label: string; color: string; cuentaComo: string[] }> = {
  TRABAJADO: {
    label: 'Días Trabajados',
    color: '#22c55e',
    cuentaComo: ['DIA_TRABAJADO'],
  },
  DESCANSO: {
    label: 'Descanso/No Laborable',
    color: '#eab308',
    cuentaComo: ['NO_LABORABLE', 'QUINCENA'],
  },
  FALTA: {
    label: 'Inasistencias',
    color: '#ef4444',
    cuentaComo: ['FALTA', 'FALTA_JUSTIFICADA'],
  },
  VACACIONES: {
    label: 'Vacaciones',
    color: '#14b8a6',
    cuentaComo: ['VACACIONES'],
  },
  LICENCIA: {
    label: 'Licencias',
    color: '#6b7280',
    cuentaComo: ['LICENCIA'],
  },
  SUBSIDIO: {
    label: 'Subsidios',
    color: '#f97316',
    cuentaComo: ['SUBSIDIADO'],
  },
  FERIADO: {
    label: 'Feriado Trabajado',
    color: '#f59e0b',
    cuentaComo: ['FERIADO_TRABAJADO'],
  },
  OTROS: {
    label: 'Otros',
    color: '#8b5cf6',
    cuentaComo: ['FERIADO', 'EXTRA', 'PERMISO', 'SUSPENSION', 'SIN_CONTRATO'],
  },
};

export function TareoLeyenda({ tiposMarcacion, className, defaultOpen = true, compact = false }: TareoLeyendaProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Agrupar tipos por categoría
  const tiposAgrupados = Object.entries(CATEGORIAS).map(([key, cat]) => {
    const tipos = tiposMarcacion.filter(t => cat.cuentaComo.includes(t.cuenta_como || ''));
    return { key, ...cat, tipos };
  }).filter(cat => cat.tipos.length > 0);

  if (compact) {
    // Vista compacta: solo códigos con tooltip
    return (
      <div className={cn('flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md', className)}>
        <span className="text-xs font-medium text-muted-foreground mr-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Leyenda:
        </span>
        {tiposMarcacion.map(tipo => (
          <Tooltip key={tipo.id}>
            <TooltipTrigger asChild>
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold cursor-help"
                style={{ backgroundColor: `${tipo.color}25`, color: tipo.color }}
              >
                {tipo.codigo}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-medium">{tipo.codigo}</p>
              <p className="text-xs text-muted-foreground">{tipo.descripcion}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Vista completa: agrupada por categorías
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Leyenda de Marcaciones</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/30 rounded-lg border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tiposAgrupados.map(categoria => (
              <div key={categoria.key} className="space-y-2">
                {/* Título de categoría */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoria.color }}
                  />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {categoria.label}
                  </span>
                </div>

                {/* Tipos de la categoría */}
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {categoria.tipos.map(tipo => (
                    <Tooltip key={tipo.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-help hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${tipo.color}20`, color: tipo.color }}
                        >
                          <span className="font-bold">{tipo.codigo}</span>
                          <span className="hidden sm:inline text-[10px] opacity-75 max-w-[80px] truncate">
                            {tipo.descripcion}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-medium">{tipo.codigo} - {tipo.descripcion}</p>
                        {tipo.horas_default && (
                          <p className="text-xs text-muted-foreground">{tipo.horas_default} horas</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Indicadores especiales */}
          <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-6 h-4 rounded"
                style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 2px, #e5e7eb 2px, #e5e7eb 4px)' }}
              />
              <span>Fuera de contrato</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded ring-2 ring-yellow-400 ring-inset bg-white" />
              <span>Cambio pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative inline-block w-4 h-4 rounded bg-gray-100">
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              </span>
              <span>Con justificación</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
