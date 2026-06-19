'use client';

import { SucamecResumen } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, XCircle, Ban, IdCard } from 'lucide-react';

interface SucamecResumenCardsProps {
  resumen: SucamecResumen;
  onFilterVigentes: () => void;
  onFilterPorVencer: () => void;
  onFilterVencidos: () => void;
  onFilterSuspendidos: () => void;
  onClearFilters: () => void;
}

export function SucamecResumenCards({
  resumen,
  onFilterVigentes,
  onFilterPorVencer,
  onFilterVencidos,
  onFilterSuspendidos,
  onClearFilters,
}: SucamecResumenCardsProps) {
  return (
    <div className="grid gap-2 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onFilterVigentes}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vigentes</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-green-600">{resumen.vigentes}</div>
          <p className="text-xs text-muted-foreground mt-1">Carnets activos</p>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onFilterPorVencer}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-yellow-600">{resumen.por_vencer}</div>
          <p className="text-xs text-muted-foreground mt-1">Vencen en 30 dias</p>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onFilterVencidos}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-red-600">{resumen.vencidos}</div>
          <p className="text-xs text-muted-foreground mt-1">Requieren renovacion</p>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onFilterSuspendidos}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Suspendidos</CardTitle>
          <Ban className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-orange-600">{resumen.suspendidos}</div>
          <p className="text-xs text-muted-foreground mt-1">Temporalmente inactivos</p>
        </CardContent>
      </Card>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClearFilters}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <IdCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{resumen.total}</div>
          <p className="text-xs text-muted-foreground mt-1">Todos los carnets</p>
        </CardContent>
      </Card>
    </div>
  );
}
