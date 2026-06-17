'use client';

import { Postulante } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  postulante: Postulante;
}

export function DatosPostulanteCard({ postulante }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del Postulante</CardTitle>
        <CardDescription>Informacion que se copiara al nuevo empleado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Documento</p>
            <p className="font-medium">{postulante.tipo_documento}: {postulante.numero_documento}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{postulante.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Celular</p>
            <p className="font-medium">{postulante.celular || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vacante</p>
            <p className="font-medium">{postulante.vacante?.titulo}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pretension Salarial</p>
            <p className="font-medium">
              {postulante.pretension_salarial
                ? `S/. ${Number(postulante.pretension_salarial).toFixed(2)}`
                : '-'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
