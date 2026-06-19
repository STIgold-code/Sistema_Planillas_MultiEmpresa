'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingDown, DollarSign, Users } from 'lucide-react';
import { Planilla } from '@/types';

interface PlanillaResumenProps {
  planilla: Planilla;
  formatCurrency: (value: number) => string;
}

export function PlanillaResumen({ planilla, formatCurrency }: PlanillaResumenProps) {
  return (
    <div className="grid gap-2 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
          <Banknote className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-green-600">
            {formatCurrency(planilla.total_bruto)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Descuentos</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-red-600">
            {formatCurrency(planilla.total_descuentos)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Neto a Pagar</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold text-blue-600">
            {formatCurrency(planilla.total_neto)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Empleados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{planilla.total_empleados}</div>
        </CardContent>
      </Card>
    </div>
  );
}
