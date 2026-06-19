'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface TasaPension {
  nombre: string;
  tipo: string;
  aporte_obligatorio: number;
  prima_seguro: number;
  comision_flujo: number;
  updated_at: string;
}

type EstadoTasas = 'actualizado' | 'advertencia' | 'desactualizado';

export function IndicadorTasasSBS() {
  const [tasas, setTasas] = useState<TasaPension[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [estado, setEstado] = useState<EstadoTasas>('actualizado');

  useEffect(() => {
    const fetchTasas = async () => {
      try {
        const response = await api.get('/masters/regimenes-pensionarios') as TasaPension[];
        const data = response;

        if (Array.isArray(data) && data.length > 0) {
          setTasas(data);

          // Encontrar la fecha más reciente de actualización
          const fechas = data
            .filter((t: TasaPension) => t.updated_at)
            .map((t: TasaPension) => new Date(t.updated_at));

          if (fechas.length > 0) {
            const masReciente = new Date(Math.max(...fechas.map(f => f.getTime())));
            setUltimaActualizacion(masReciente);

            // Calcular estado según antigüedad
            const ahora = new Date();
            const diffHoras = (ahora.getTime() - masReciente.getTime()) / (1000 * 60 * 60);

            if (diffHoras <= 24) {
              setEstado('actualizado');
            } else if (diffHoras <= 72) {
              setEstado('advertencia');
            } else {
              setEstado('desactualizado');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching tasas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasas();
  }, []);

  if (loading) {
    return null;
  }

  const colores: Record<EstadoTasas, string> = {
    actualizado: 'bg-emerald-500',
    advertencia: 'bg-amber-500',
    desactualizado: 'bg-red-500',
  };

  const pulso: Record<EstadoTasas, string> = {
    actualizado: '',
    advertencia: 'animate-pulse',
    desactualizado: 'animate-pulse',
  };

  const afps = tasas.filter(t => t.tipo === 'AFP');
  const onp = tasas.find(t => t.tipo === 'ONP');

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-default select-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${colores[estado]} ${pulso[estado]} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${colores[estado]}`}></span>
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Tasas SBS
            </span>
            {ultimaActualizacion && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {format(ultimaActualizacion, 'dd/MM')}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="w-72 p-0 overflow-hidden"
        >
          <div className="bg-slate-900 text-white">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tasas de Pensiones
                </span>
                <span className="text-[10px] text-slate-500">
                  Fuente: SBS
                </span>
              </div>
              {ultimaActualizacion && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Actualizado: {format(ultimaActualizacion, "dd/MM/yyyy HH:mm")}
                </p>
              )}
            </div>

            {/* AFP Table */}
            <div className="px-3 py-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left font-medium pb-1">AFP</th>
                    <th className="text-right font-medium pb-1">Aporte</th>
                    <th className="text-right font-medium pb-1">Prima</th>
                    <th className="text-right font-medium pb-1">Com.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {afps.map((afp) => (
                    <tr key={afp.nombre} className="border-t border-slate-800">
                      <td className="py-1 font-medium">{afp.nombre}</td>
                      <td className="py-1 text-right tabular-nums">
                        {Number(afp.aporte_obligatorio || 0).toFixed(1)}%
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {Number(afp.prima_seguro || 0).toFixed(2)}%
                      </td>
                      <td className="py-1 text-right tabular-nums text-amber-400">
                        {Number(afp.comision_flujo || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ONP */}
            {onp && (
              <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">ONP</span>
                  <span className="tabular-nums text-slate-200">
                    {Number(onp.aporte_obligatorio || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
