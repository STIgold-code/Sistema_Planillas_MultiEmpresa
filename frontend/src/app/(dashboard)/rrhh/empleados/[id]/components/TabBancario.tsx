'use client';

import { Empleado } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

interface TabBancarioProps {
  empleado: Empleado;
}

export function TabBancario({ empleado }: TabBancarioProps) {
  return (
    <TabsContent value="bancario">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Cuenta de Haberes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">Banco:</dt>
                <dd className="font-medium">{empleado.banco_haberes?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">Numero Cuenta:</dt>
                <dd className="font-mono font-medium break-all">{empleado.nro_cuenta_haberes || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">CCI:</dt>
                <dd className="font-mono font-medium break-all">{empleado.cci_haberes || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Cuenta CTS</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">Banco:</dt>
                <dd className="font-medium">{empleado.banco_cts?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">Numero Cuenta:</dt>
                <dd className="font-mono font-medium break-all">{empleado.nro_cuenta_cts || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-28">CCI:</dt>
                <dd className="font-mono font-medium break-all">{empleado.cci_cts || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
