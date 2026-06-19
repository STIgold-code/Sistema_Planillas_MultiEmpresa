'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EstadoPostulante, Postulante } from '@/types';
import {
  ArrowLeft,
  Loader2,
  XCircle,
  UserCheck,
  RotateCcw,
  Pencil,
  CheckCircle2,
} from 'lucide-react';

const estadoBadgeVariant: Record<EstadoPostulante, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  EN_PROCESO: 'secondary',
  APROBADO: 'default',
  RECHAZADO: 'destructive',
};

interface PostulanteHeaderProps {
  id: string;
  postulante: Postulante;
  actionLoading: boolean;
  puedeAprobar: boolean;
  puedeRechazar: boolean;
  puedeConvertir: boolean;
  missingRequirements: string[];
  onBack: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onVolverAProceso: () => void;
}

export function PostulanteHeader({
  id,
  postulante,
  actionLoading,
  puedeAprobar,
  puedeRechazar,
  puedeConvertir,
  missingRequirements,
  onBack,
  onAprobar,
  onRechazar,
  onVolverAProceso,
}: PostulanteHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">
              {postulante.apellido_paterno} {postulante.apellido_materno}, {postulante.nombres}
            </h1>
            <Badge variant={estadoBadgeVariant[postulante.estado]}>{postulante.estado}</Badge>
          </div>
          <p className="text-muted-foreground">
            {postulante.tipo_documento}: {postulante.numero_documento}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!postulante.empleado_id && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rrhh/seleccion/postulantes/${id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
        {postulante.estado === 'EN_PROCESO' && (
          <Button
            size="sm"
            onClick={onAprobar}
            disabled={actionLoading || !puedeAprobar}
            title={missingRequirements.length > 0 ? `Falta: ${missingRequirements.join('; ')}` : undefined}
          >
            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Aprobar
          </Button>
        )}
        {puedeRechazar && (
          <Button variant="destructive" size="sm" onClick={onRechazar} disabled={actionLoading}>
            <XCircle className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
        )}
        {postulante.estado === 'RECHAZADO' && !postulante.empleado_id && (
          <Button variant="outline" size="sm" onClick={onVolverAProceso} disabled={actionLoading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Volver a En Proceso
          </Button>
        )}
        {puedeConvertir && (
          <Button size="sm" asChild>
            <Link href={`/rrhh/seleccion/postulantes/${id}/convertir`}>
              <UserCheck className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Convertir a </span>Empleado
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
