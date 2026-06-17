'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, XCircle, CheckCircle2 } from 'lucide-react';
import type { TareoGrillaResponse } from '@/types';

interface ResumenPeriodoProps {
  resumen: NonNullable<TareoGrillaResponse['resumen_periodo']>;
}

export function ResumenPeriodo({ resumen }: ResumenPeriodoProps) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Descanso Médico</CardTitle>
          <Coffee className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{resumen.descansos_medicos}</div>
          <p className="text-xs text-muted-foreground">días subsidiados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Licencia S/Goce</CardTitle>
          <Coffee className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{resumen.licencias_sin_goce}</div>
          <p className="text-xs text-muted-foreground">sin remuneración</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Faltas</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{resumen.faltas}</div>
          <p className="text-xs text-muted-foreground">injustificadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Descansos Trab.</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{resumen.descansos_trabajados}</div>
          <p className="text-xs text-muted-foreground">domingos/sábados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Feriados Trab.</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{resumen.feriados_trabajados}</div>
          <p className="text-xs text-muted-foreground">días feriados</p>
        </CardContent>
      </Card>
    </div>
  );
}
