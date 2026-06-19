'use client';

import { Check, X, Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateSafe } from '@/lib/utils';
import { ArchivoPreview } from './ArchivoPreview';
import { AlertaUniformesPendientes } from '@/components/inventario/alerta-uniformes-pendientes';
import type { SolicitudCesePendiente } from '@/app/(dashboard)/useDashboard';

interface Props {
  open: boolean;
  solicitud: SolicitudCesePendiente | null;
  onOpenChange: (open: boolean) => void;
  onAprobar: () => void;
  onRechazar: () => void;
}

export function SolicitudCeseDetalleDialog({
  open,
  solicitud,
  onOpenChange,
  onAprobar,
  onRechazar,
}: Props) {
  if (!solicitud) return null;

  const archivos = solicitud.archivos ?? [];
  const nombreEmpleado = `${solicitud.empleado.apellido_paterno} ${solicitud.empleado.apellido_materno}, ${solicitud.empleado.nombres}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitud de Cese</DialogTitle>
          <DialogDescription>
            Revisa los documentos adjuntos antes de aprobar o rechazar.
          </DialogDescription>
        </DialogHeader>

        {/* Datos de la solicitud */}
        <div className="space-y-3 py-3 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Empleado</p>
              <p className="font-medium">{nombreEmpleado}</p>
              <p className="text-xs text-muted-foreground font-mono">
                DNI {solicitud.empleado.numero_documento}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p>{solicitud.empleado.cargo?.nombre || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de cese</p>
              <Badge variant="outline">{solicitud.tipo_cese?.nombre || '-'}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha efectiva</p>
              <p>{formatDateSafe(solicitud.fecha_efectiva)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Solicitado por</p>
              <p>{solicitud.solicitado_por.nombre_completo}</p>
            </div>
            {solicitud.motivo && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Motivo / observaciones</p>
                <p className="whitespace-pre-wrap text-sm bg-muted/30 rounded p-2 border">
                  {solicitud.motivo}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Uniformes sin devolver (informativo, se autooculta si no hay) */}
        <div className="py-3">
          <AlertaUniformesPendientes empleadoId={solicitud.empleado.id} />
        </div>

        {/* Documentos adjuntos */}
        <div className="space-y-3 py-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              Documentos adjuntos ({archivos.length})
            </h3>
          </div>

          {archivos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Sin documentos adjuntos (solicitud anterior a la nueva regla obligatoria).
            </p>
          ) : (
            <div className="space-y-3">
              {archivos.map((archivo) => (
                <ArchivoPreview key={archivo.id} archivo={archivo} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 border-t pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
          <Button
            variant="destructive"
            onClick={onRechazar}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
          <Button
            onClick={onAprobar}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
