'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SolicitudExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (motivo: string, tiempoMin: number) => Promise<void>;
  tiempoActual?: number; // Tiempo de sesión actual en minutos
  maxTiempo?: number; // Máximo tiempo que se puede solicitar
}

const TIEMPOS_EXTENSION = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 minutos' },
  { value: 120, label: '2 horas' },
];

export function SolicitudExtensionModal({
  open,
  onOpenChange,
  onSubmit,
  tiempoActual = 60,
  maxTiempo = 120,
}: SolicitudExtensionModalProps) {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [tiempoSolicitado, setTiempoSolicitado] = useState(30);

  const tiemposDisponibles = TIEMPOS_EXTENSION.filter((t) => t.value <= maxTiempo);

  const handleSubmit = async () => {
    if (!motivo.trim()) {
      toast.error('Debe indicar el motivo de la extensión');
      return;
    }

    if (motivo.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(motivo.trim(), tiempoSolicitado);
      toast.success('Solicitud de extensión enviada correctamente');
      setMotivo('');
      setTiempoSolicitado(30);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al enviar la solicitud';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMotivo('');
      setTiempoSolicitado(30);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 gap-0',
          'w-full h-auto max-w-full rounded-t-lg rounded-b-none',
          'sm:w-[450px] sm:max-h-[90vh] sm:rounded-lg'
        )}
      >
        <DialogHeader className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b bg-background space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <DialogTitle className="text-base sm:text-lg">
              Solicitar Extensión de Tiempo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm">
            Tu sesión de tareo ha expirado. Solicita más tiempo para continuar editando.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 sm:px-6">
          <div className="grid gap-4">
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs sm:text-sm text-amber-800">
                Tu sesión de {tiempoActual} minutos ha finalizado. Un corrector revisará
                tu solicitud y podrás continuar una vez sea aprobada.
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Tiempo adicional solicitado</Label>
              <Select
                value={tiempoSolicitado.toString()}
                onValueChange={(v) => setTiempoSolicitado(parseInt(v))}
              >
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiemposDisponibles.map((t) => (
                    <SelectItem key={t.value} value={t.value.toString()}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">
                Motivo de la extensión <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica por qué necesitas más tiempo para completar el tareo..."
                rows={4}
                className="text-xs sm:text-sm resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {motivo.length}/500 caracteres (mínimo 10)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t bg-background gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || motivo.trim().length < 10}
            className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm"
          >
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
