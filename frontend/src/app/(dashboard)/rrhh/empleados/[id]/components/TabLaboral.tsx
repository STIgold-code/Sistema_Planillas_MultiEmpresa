'use client';

import { Empleado } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

interface TabLaboralProps {
  empleado: Empleado;
  formatDate: (date: string | null | undefined) => string;
  formatCurrency: (amount: number) => string;
}

export function TabLaboral({ empleado, formatDate, formatCurrency }: TabLaboralProps) {
  const contratoVigente = empleado.contratos?.find(c => c.estado === 'ACTIVO');

  return (
    <TabsContent value="laboral">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Puesto de Trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-20">Area:</dt>
                <dd className="font-medium">{empleado.area?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-20">Cargo:</dt>
                <dd className="font-medium">{empleado.cargo?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-20">Sede:</dt>
                <dd className="font-medium">{empleado.sede?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-20">Turno:</dt>
                <dd className="font-medium">{empleado.turno === 'DIA' ? 'Dia' : 'Noche'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Fechas</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Fecha Ingreso:</dt>
                <dd className="font-medium">{formatDate(empleado.fecha_ingreso)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Fecha Planilla:</dt>
                <dd className="font-medium">{formatDate(empleado.fecha_planilla)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Fin Contrato:</dt>
                <dd className="font-medium">
                  {contratoVigente?.fecha_fin ? formatDate(contratoVigente.fecha_fin) : '-'}
                </dd>
              </div>
              {empleado.estado === 'CESADO' && (
                <div className="flex flex-col sm:flex-row sm:gap-2">
                  <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Fecha Cese:</dt>
                  <dd className="font-medium text-destructive">{formatDate(empleado.fecha_cese)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Remuneracion</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-36">Sueldo Base:</dt>
                <dd className="font-semibold text-base">{formatCurrency(empleado.sueldo_base)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-36">Tipo Pago:</dt>
                <dd className="font-medium">{empleado.tipo_pago}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-36">Regimen Pensionario:</dt>
                <dd className="font-medium">{empleado.regimen_pensionario?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-36">CUSPP:</dt>
                <dd className="font-mono font-medium">{empleado.cuspp || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Beneficios</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Asignacion Familiar:</dt>
                <dd className="font-medium">{empleado.asignacion_familiar ? 'Si' : 'No'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">SCTR:</dt>
                <dd className="font-medium">{empleado.sctr ? 'Si' : 'No'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Es MYPE:</dt>
                <dd className="font-medium">{empleado.es_mype ? 'Si' : 'No'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
