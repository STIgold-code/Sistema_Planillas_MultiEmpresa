'use client';

import { CarnetSucamec } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';

interface Props {
  carnetVigente: CarnetSucamec;
  yaVencido: boolean;
  getDiasParaVencer: (fecha: string) => number;
  onRenovar: (carnet: CarnetSucamec) => void;
}

export function SucamecAlertaVencimiento({ carnetVigente, yaVencido, getDiasParaVencer, onRenovar }: Props) {
  const dias = getDiasParaVencer(carnetVigente.fecha_vencimiento);

  return (
    <Card className={yaVencido ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${yaVencido ? 'text-red-600' : 'text-yellow-600'}`} />
          <div className="flex-1">
            <p className={`font-medium ${yaVencido ? 'text-red-800' : 'text-yellow-800'}`}>
              {yaVencido ? 'Carnet SUCAMEC vencido' : 'Carnet SUCAMEC proximo a vencer'}
            </p>
            <p className={`text-sm ${yaVencido ? 'text-red-700' : 'text-yellow-700'}`}>
              {yaVencido
                ? `El carnet vencio hace ${Math.abs(dias)} dias`
                : `El carnet vence en ${dias} dias (${formatDateSafe(carnetVigente.fecha_vencimiento)})`}
            </p>
          </div>
          <Button
            size="sm"
            variant={yaVencido ? 'destructive' : 'default'}
            onClick={() => onRenovar(carnetVigente)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Renovar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
