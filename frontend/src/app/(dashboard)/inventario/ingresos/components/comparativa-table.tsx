'use client';

import { Badge } from '@/components/ui/badge';
import type { ComparativaLinea } from '@/types/inventario';

interface Props {
  comparativa: ComparativaLinea[];
}

/** Color del badge de delta: rojo = falta, ámbar = sobra, verde = coincide. */
function deltaBadge(delta: number): { clase: string; texto: string } {
  if (delta < 0)
    return {
      clase: 'bg-red-100 text-red-700 border-red-200',
      texto: String(delta),
    };
  if (delta > 0)
    return {
      clase: 'bg-amber-100 text-amber-700 border-amber-200',
      texto: `+${delta}`,
    };
  return {
    clase: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    texto: '0',
  };
}

export function ComparativaTable({ comparativa }: Props) {
  if (comparativa.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
        El requerimiento no tiene prendas pedidas ni recibidas.
      </p>
    );
  }

  const totalPedido = comparativa.reduce((acc, c) => acc + c.pedido, 0);
  const totalRecibido = comparativa.reduce((acc, c) => acc + c.recibido, 0);
  const totalDelta = totalRecibido - totalPedido;
  const badgeTotal = deltaBadge(totalDelta);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left">Prenda</th>
            <th className="px-3 py-1.5 text-center">Talla</th>
            <th className="px-3 py-1.5 text-center">Pedido</th>
            <th className="px-3 py-1.5 text-center">Recibido</th>
            <th className="px-3 py-1.5 text-center">Delta</th>
          </tr>
        </thead>
        <tbody>
          {comparativa.map((c) => {
            const badge = deltaBadge(c.delta);
            return (
              <tr
                key={`${c.tipo_uniforme_id}-${c.talla}`}
                className="border-t"
              >
                <td className="px-3 py-1.5">{c.tipo_nombre}</td>
                <td className="px-3 py-1.5 text-center">{c.talla}</td>
                <td className="px-3 py-1.5 text-center tabular-nums">
                  {c.pedido}
                </td>
                <td className="px-3 py-1.5 text-center tabular-nums">
                  {c.recibido}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] tabular-nums ${badge.clase}`}
                  >
                    {badge.texto}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/30 text-sm font-semibold">
          <tr className="border-t">
            <td className="px-3 py-1.5" colSpan={2}>
              Total
            </td>
            <td className="px-3 py-1.5 text-center tabular-nums">
              {totalPedido}
            </td>
            <td className="px-3 py-1.5 text-center tabular-nums">
              {totalRecibido}
            </td>
            <td className="px-3 py-1.5 text-center">
              <Badge
                variant="outline"
                className={`text-[10px] tabular-nums ${badgeTotal.clase}`}
              >
                {badgeTotal.texto}
              </Badge>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
