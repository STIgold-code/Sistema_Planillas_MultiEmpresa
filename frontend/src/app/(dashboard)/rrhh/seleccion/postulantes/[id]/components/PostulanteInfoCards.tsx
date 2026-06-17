'use client';

import Link from 'next/link';
import { Postulante } from '@/types';
import { formatDateSafe } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface PostulanteInfoCardsProps {
  postulante: Postulante;
}

export function PostulanteInfoCards({ postulante }: PostulanteInfoCardsProps) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{postulante.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Celular</p>
                <p className="font-medium">{postulante.celular || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Nacimiento</p>
                <p className="font-medium">
                  {postulante.fecha_nacimiento ? formatDateSafe(postulante.fecha_nacimiento) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sexo</p>
                <p className="font-medium">
                  {postulante.sexo === 'M' ? 'Masculino' : postulante.sexo === 'F' ? 'Femenino' : '-'}
                </p>
              </div>
            </div>
            {postulante.direccion && (
              <div>
                <p className="text-sm text-muted-foreground">Direccion</p>
                <p className="font-medium">{postulante.direccion}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informacion de Postulacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Vacante</p>
              <p className="font-medium">
                {postulante.vacante?.codigo} - {postulante.vacante?.titulo}
              </p>
            </div>
            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Fecha Postulacion</p>
                <p className="font-medium">{formatDateSafe(postulante.fecha_postulacion)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pretension Salarial</p>
                <p className="font-medium">
                  {postulante.pretension_salarial
                    ? `S/. ${Number(postulante.pretension_salarial).toFixed(2)}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Procedencia</p>
                <p className="font-medium">{postulante.procedencia_rel?.nombre || '-'}</p>
              </div>
            </div>
            {postulante.motivo_rechazo && (
              <div>
                <p className="text-sm text-muted-foreground">Motivo de Rechazo</p>
                <p className="font-medium text-destructive">{postulante.motivo_rechazo}</p>
              </div>
            )}
            {postulante.empleado_id && (
              <div className="rounded-lg bg-green-50 p-3 text-green-800">
                <p className="font-medium">Convertido a empleado</p>
                <Link href={`/rrhh/empleados/${postulante.empleado_id}`} className="text-sm underline">
                  Ver ficha del empleado
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {postulante.vacante?.requisitos && postulante.vacante.requisitos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requisitos de la Vacante</CardTitle>
            <CardDescription>
              Requisitos definidos para {postulante.vacante.codigo} - {postulante.vacante.titulo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {postulante.vacante.requisitos.map((req, idx) => {
                const isString = typeof req === 'string';
                const tipo = isString ? '' : req.tipo;
                const descripcion = isString ? req : req.descripcion;
                const obligatorio = isString ? false : req.obligatorio;
                return (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      {tipo && <span className="text-sm font-medium">{tipo}: </span>}
                      <span className="text-sm">{descripcion || '-'}</span>
                      {obligatorio && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Obligatorio
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
