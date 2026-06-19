'use client';

import { DatoHistorico } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MovimientosHistoricoProps {
  historico: DatoHistorico[];
}

export function MovimientosHistorico({ historico }: MovimientosHistoricoProps) {
  if (historico.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tendencia últimos 6 meses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {historico.map((dato, index) => {
            const maxValue = Math.max(...historico.flatMap(d => [d.ingresos, d.ceses, d.vencimientos]), 1);
            const ingresosHeight = (dato.ingresos / maxValue) * 100;
            const cesessHeight = (dato.ceses / maxValue) * 100;
            const vencimientosHeight = (dato.vencimientos / maxValue) * 100;

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 h-24 w-full justify-center">
                  <div
                    className="w-2 bg-green-500 rounded-t transition-all"
                    style={{ height: `${ingresosHeight}%` }}
                    title={`Ingresos: ${dato.ingresos}`}
                  />
                  <div
                    className="w-2 bg-red-500 rounded-t transition-all"
                    style={{ height: `${cesessHeight}%` }}
                    title={`Ceses: ${dato.ceses}`}
                  />
                  <div
                    className="w-2 bg-yellow-500 rounded-t transition-all"
                    style={{ height: `${vencimientosHeight}%` }}
                    title={`Vencimientos: ${dato.vencimientos}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{dato.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded" />
            <span>Ingresos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded" />
            <span>Ceses</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded" />
            <span>Vencimientos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
