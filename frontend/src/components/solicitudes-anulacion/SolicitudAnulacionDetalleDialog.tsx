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
import { ArchivoPreview } from '@/components/solicitudes-cese/ArchivoPreview';
import type { SolicitudAnulacionPendiente } from '@/types/solicitudes-anulacion';

interface Props {
  open: boolean;
  solicitud: SolicitudAnulacionPendiente | null;
  onOpenChange: (open: boolean) => void;
  onAprobar: () => void;
  onRechazar: () => void;
}

export function SolicitudAnulacionDetalleDialog({
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
          <DialogTitle>Solicitud de Anulación de Contrato</DialogTitle>
          <DialogDescription>
            Revisa el motivo y los documentos adjuntos antes de aprobar o rechazar.
          </DialogDescription>
        </DialogHeader>

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
              <p className="text-xs text-muted-foreground">Contrato a anular</p>
              <p>
                #{solicitud.contrato.id} — {solicitud.contrato.tipo_contrato}
                {solicitud.contrato.numero_renovacion && solicitud.contrato.numero_renovacion > 1 ? (
                  <span className="text-xs text-muted-foreground"> (renov #{solicitud.contrato.numero_renovacion})</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateSafe(solicitud.contrato.fecha_inicio)}
                {solicitud.contrato.fecha_fin ? ` → ${formatDateSafe(solicitud.contrato.fecha_fin)}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado actual</p>
              <Badge variant="outline">{solicitud.contrato.estado}</Badge>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Solicitado por</p>
              <p>{solicitud.solicitado_por.nombre_completo}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Motivo</p>
              <p className="whitespace-pre-wrap text-sm bg-muted/30 rounded p-2 border">
                {solicitud.motivo}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 py-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              Documentos adjuntos ({archivos.length})
            </h3>
          </div>

          {archivos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sin documentos adjuntos.</p>
          ) : (
            <div className="space-y-3">
              {archivos.map((archivo) => (
                <ArchivoPreview key={archivo.id} archivo={archivo} />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cerrar
          </Button>
          <Button variant="destructive" onClick={onRechazar} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Rechazar
          </Button>
          <Button onClick={onAprobar} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
            <Check className="mr-2 h-4 w-4" />
            Aprobar Anulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
