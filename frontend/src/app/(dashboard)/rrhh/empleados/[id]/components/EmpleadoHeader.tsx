'use client';

import { useRouter } from 'next/navigation';
import { Empleado } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, User } from 'lucide-react';
import { PhotocheckButton } from '@/components/photocheck';

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  PENDIENTE: 'secondary',
  CESADO: 'destructive',
};

const estadoBadgeClass: Record<string, string> = {
  ACTIVO: '',
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80',
  CESADO: '',
};

const estadoDocBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  COMPLETO: 'default',
  INCOMPLETO: 'secondary',
  PENDIENTE: 'outline',
  VENCIDO: 'destructive',
};

const estadoDocLabel: Record<string, string> = {
  COMPLETO: 'Docs. Completos',
  INCOMPLETO: 'Docs. Incompletos',
  PENDIENTE: 'Docs. Pendientes',
  VENCIDO: 'Docs. Vencidos',
};

interface EmpleadoHeaderProps {
  empleado: Empleado;
  fotoUrl: string | null;
  nombreCompleto: string;
}

export function EmpleadoHeader({ empleado, fotoUrl, nombreCompleto }: EmpleadoHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {/* Row 1: Back button + Name */}
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/rrhh/empleados')}
          className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {fotoUrl ? (
          // fotoUrl es un blob: URL generado por useAuthImage (imagen protegida por JWT).
          // El optimizador de next/image no puede procesar blob URLs, por eso usamos <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt={nombreCompleto}
            className="shrink-0 h-14 w-14 rounded-full object-cover border"
          />
        ) : (
          <div className="shrink-0 h-14 w-14 rounded-full bg-muted flex items-center justify-center border">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold leading-tight">
            {nombreCompleto}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {empleado.tipo_documento}: {empleado.numero_documento}
          </p>
        </div>
      </div>

      {/* Row 2: Badges + Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={estadoBadgeVariant[empleado.estado]} className={cn('text-xs', estadoBadgeClass[empleado.estado])}>
            {empleado.estado}
          </Badge>
          {empleado.estado_documentacion && (
            <Badge variant={estadoDocBadgeVariant[empleado.estado_documentacion]} className="text-xs">
              {estadoDocLabel[empleado.estado_documentacion]}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <PhotocheckButton empleado={empleado} />
          <Button
            onClick={() => router.push(`/rrhh/empleados/${empleado.id}/editar`)}
            size="sm"
          >
            <Pencil className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
