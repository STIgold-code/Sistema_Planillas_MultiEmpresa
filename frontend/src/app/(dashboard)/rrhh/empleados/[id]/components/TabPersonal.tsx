'use client';

import { Empleado } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

interface TabPersonalProps {
  empleado: Empleado;
  formatDate: (date: string | null | undefined) => string;
}

export function TabPersonal({ empleado, formatDate }: TabPersonalProps) {
  return (
    <TabsContent value="personal">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Informacion Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Tipo Documento:</dt>
                <dd className="font-medium">{empleado.tipo_documento}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Numero:</dt>
                <dd className="font-mono font-medium">{empleado.numero_documento}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Fecha Nacimiento:</dt>
                <dd className="font-medium">{formatDate(empleado.fecha_nacimiento)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Sexo:</dt>
                <dd className="font-medium">{empleado.sexo === 'M' ? 'Masculino' : 'Femenino'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Estado Civil:</dt>
                <dd className="font-medium">{empleado.estado_civil || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Nacionalidad:</dt>
                <dd className="font-medium">{empleado.nacionalidad || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Celular:</dt>
                <dd className="font-medium">{empleado.celular || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Telefono:</dt>
                <dd className="font-medium">{empleado.telefono || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Email Personal:</dt>
                <dd className="font-medium break-all">{empleado.email || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Celular Asignado:</dt>
                <dd className="font-medium">{empleado.celular_asignado || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-32">Email Corporativo:</dt>
                <dd className="font-medium break-all">{empleado.email_asignado || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Direccion</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-24">Direccion:</dt>
                <dd className="font-medium">{empleado.direccion || '-'}</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-24">Referencia:</dt>
                <dd className="font-medium">{empleado.referencia || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-24">Departamento:</dt>
                <dd className="font-medium">{empleado.distrito?.provincia?.departamento?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-24">Provincia:</dt>
                <dd className="font-medium">{empleado.distrito?.provincia?.nombre || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-xs sm:text-sm text-muted-foreground shrink-0 sm:w-24">Distrito:</dt>
                <dd className="font-medium">{empleado.distrito?.nombre || '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
