'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Paperclip } from 'lucide-react';
import {
  EXTENSIONES_ACEPTADAS,
  Prestamo,
  TIPO_ETIQUETA,
} from '../usePrestamos';

interface Props {
  open: boolean;
  onOpenChange: (valor: boolean) => void;
  prestamo: Prestamo | null;
  onAdjuntar: (archivos: File[]) => void;
  adjuntando: boolean;
}

/**
 * Regularización documental: sube el convenio de un préstamo que se registró
 * antes de que el adjunto fuera obligatorio.
 */
export function AdjuntarConvenioDialog({
  open,
  onOpenChange,
  prestamo,
  onAdjuntar,
  adjuntando,
}: Props) {
  const [archivos, setArchivos] = useState<File[]>([]);

  // La selección se limpia al cerrar (sin efecto: evita renders en cascada).
  // El cierre programático tras subir lo cubre el `key` del componente padre.
  const manejarApertura = (valor: boolean) => {
    if (!valor) setArchivos([]);
    onOpenChange(valor);
  };

  const nombre = prestamo
    ? `${prestamo.empleado.apellido_paterno} ${prestamo.empleado.apellido_materno}, ${prestamo.empleado.nombres}`
    : '';

  return (
    <Dialog open={open} onOpenChange={manejarApertura}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjuntar convenio</DialogTitle>
          <DialogDescription>
            {prestamo
              ? `${TIPO_ETIQUETA[prestamo.tipo]} de ${nombre}. El documento queda vinculado al préstamo y al legajo del trabajador.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {prestamo && prestamo.archivos.length > 0 && (
            <div className="space-y-1">
              <Label>Documentos ya adjuntos</Label>
              <ul className="text-sm text-muted-foreground space-y-1">
                {prestamo.archivos.map((archivo) => (
                  <li key={archivo.id} className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{archivo.archivo_nombre}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="convenio-archivos">Documento *</Label>
            <Input
              id="convenio-archivos"
              type="file"
              multiple
              accept={EXTENSIONES_ACEPTADAS}
              onChange={(evento) =>
                setArchivos(Array.from(evento.target.files ?? []))
              }
            />
            <p className="text-sm text-muted-foreground">
              PDF, Word, Excel o imagen (máx. 10 MB por archivo).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => manejarApertura(false)}
            disabled={adjuntando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onAdjuntar(archivos)}
            disabled={adjuntando || archivos.length === 0}
          >
            {adjuntando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adjuntar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
