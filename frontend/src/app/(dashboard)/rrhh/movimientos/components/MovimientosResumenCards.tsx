'use client';

import { MovimientosResumen, TipoMovimientoFiltro, Tendencia } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, UserMinus, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MovimientosResumenCardsProps {
  resumen: MovimientosResumen;
  tendencia: Tendencia | null;
  tipoFiltro: string;
  onCardClick: (tipo: TipoMovimientoFiltro | '') => void;
}

export function MovimientosResumenCards({
  resumen,
  tendencia,
  tipoFiltro,
  onCardClick,
}: MovimientosResumenCardsProps) {
  return (
    <div className="grid gap-2 md:gap-4 grid-cols-1 sm:grid-cols-3">
      <Card
        className={cn(
          'cursor-pointer transition-colors',
          tipoFiltro === 'INGRESOS' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-accent/50'
        )}
        onClick={() => onCardClick(tipoFiltro === 'INGRESOS' ? '' : 'INGRESOS')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
          <UserPlus className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-green-600">{resumen.ingresos}</div>
          {tendencia && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              tendencia.ingresos > 0 ? 'text-green-600' : tendencia.ingresos < 0 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {tendencia.ingresos > 0 ? <TrendingUp className="h-3 w-3" /> : tendencia.ingresos < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {tendencia.ingresos > 0 ? '+' : ''}{tendencia.ingresos} vs mes anterior
            </div>
          )}
        </CardContent>
      </Card>
      <Card
        className={cn(
          'cursor-pointer transition-colors',
          tipoFiltro === 'CESES' ? 'ring-2 ring-red-500 bg-red-50' : 'hover:bg-accent/50'
        )}
        onClick={() => onCardClick(tipoFiltro === 'CESES' ? '' : 'CESES')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ceses</CardTitle>
          <UserMinus className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-red-600">{resumen.ceses}</div>
          {tendencia && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              tendencia.ceses > 0 ? 'text-red-600' : tendencia.ceses < 0 ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {tendencia.ceses > 0 ? <TrendingUp className="h-3 w-3" /> : tendencia.ceses < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {tendencia.ceses > 0 ? '+' : ''}{tendencia.ceses} vs mes anterior
            </div>
          )}
        </CardContent>
      </Card>
      <Card
        className={cn(
          'cursor-pointer transition-colors',
          tipoFiltro === 'VENCIMIENTOS' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'hover:bg-accent/50'
        )}
        onClick={() => onCardClick(tipoFiltro === 'VENCIMIENTOS' ? '' : 'VENCIMIENTOS')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencimientos</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-yellow-600">{resumen.vencimientos}</div>
          {tendencia && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              tendencia.vencimientos > 0 ? 'text-yellow-600' : tendencia.vencimientos < 0 ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {tendencia.vencimientos > 0 ? <TrendingUp className="h-3 w-3" /> : tendencia.vencimientos < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {tendencia.vencimientos > 0 ? '+' : ''}{tendencia.vencimientos} vs mes anterior
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
