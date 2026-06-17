'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExistenciasStock } from '@/types/inventario';

interface Props {
  existencias: ExistenciasStock | null;
  loading: boolean;
}

const CELDAS = '[&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-200 border-collapse';

export function StockExistencias({ existencias, loading }: Props) {
  // El detalle arranca visible: es lo que el admin más mira. El maestro permite
  // ocultarlo para enfocar el resto de la pantalla.
  const [mostrarDetalle, setMostrarDetalle] = useState(true);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());

  const togglePrenda = (id: number) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!existencias) return null;

  const { totales, prendas } = existencias;

  return (
    <div className="space-y-2">
      {/* Bloque 1: cabeceras con TOTALES (siempre visible) */}
      <div className="overflow-x-auto rounded-lg border-2 border-slate-300">
        <table className={cn('w-full text-sm', CELDAS)}>
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-2.5 text-left font-semibold">
                Prenda / Talla
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Disponibles{' '}
                <span className="ml-1 rounded bg-green-500/90 px-2 py-0.5 tabular-nums">
                  {totales.disponibles}
                </span>
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Mínimo{' '}
                <span className="ml-1 rounded bg-slate-500 px-2 py-0.5 tabular-nums">
                  {totales.minimo}
                </span>
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">
                Faltan{' '}
                <span
                  className={cn(
                    'ml-1 rounded px-2 py-0.5 tabular-nums',
                    totales.faltan > 0 ? 'bg-red-500/90' : 'bg-green-500/90',
                  )}
                >
                  {totales.faltan}
                </span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Control único del desplegable maestro */}
      <button
        type="button"
        onClick={() => setMostrarDetalle((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        aria-expanded={mostrarDetalle}
      >
        <span className="flex items-center gap-1">
          {mostrarDetalle ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Ver detalle por prenda
        </span>
        <span className="text-xs text-muted-foreground">
          {prendas.length} {prendas.length === 1 ? 'prenda' : 'prendas'}
        </span>
      </button>

      {/* Bloque 2: acordeón de prendas (cada una despliega sus tallas) */}
      {mostrarDetalle &&
        (prendas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border py-10 text-muted-foreground">
            <Package className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              No hay prendas con stock ni tallas configuradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className={cn('w-full text-sm', CELDAS)}>
              <tbody className="tabular-nums">
                {prendas.map((p) => {
                  const abierta = expandidas.has(p.tipo_uniforme_id);
                  return (
                    <Fragment key={p.tipo_uniforme_id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        aria-expanded={abierta}
                        onClick={() => togglePrenda(p.tipo_uniforme_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            togglePrenda(p.tipo_uniforme_id);
                          }
                        }}
                        className="cursor-pointer bg-slate-100 font-semibold text-slate-800 hover:bg-slate-200"
                      >
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            {abierta ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {p.nombre}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{p.disponibles}</td>
                        <td className="px-3 py-2 text-right text-slate-400">—</td>
                        <td className="px-3 py-2 text-right">
                          {p.faltan > 0 ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                              faltan {p.faltan}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              ok
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {abierta &&
                        p.tallas.map((t) => (
                          <tr key={t.talla}>
                            <td className="px-3 py-1.5 pl-10 text-slate-600">
                              {t.talla}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {t.disponibles}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-500">
                              {t.minimo}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-1.5 text-right font-semibold',
                                t.faltan > 0 ? 'text-red-600' : 'text-green-600',
                              )}
                            >
                              {t.faltan}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
