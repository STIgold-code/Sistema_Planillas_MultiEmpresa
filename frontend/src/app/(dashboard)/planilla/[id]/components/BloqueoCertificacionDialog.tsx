'use client';

import { ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BloqueoCertificacion } from '@/lib/error-certificacion';

interface BloqueoCertificacionDialogProps {
  /** Datos del bloqueo; null = diálogo cerrado. */
  bloqueo: BloqueoCertificacion | null;
  onClose: () => void;
}

/**
 * Diálogo que explica el bloqueo por régimen pendiente de certificación
 * contable al calcular la planilla. Presentacional: solo recibe el bloqueo y
 * el callback de cierre. La acción "generar solo los certificados" NO se
 * ofrece porque el backend no expone ese endpoint/parámetro.
 */
export function BloqueoCertificacionDialog({
  bloqueo,
  onClose,
}: BloqueoCertificacionDialogProps) {
  const abierto = bloqueo !== null;

  return (
    <AlertDialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <AlertDialogTitle>
              Régimen pendiente de certificación
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            No se puede calcular la planilla porque hay trabajadores con un
            régimen laboral que aún no tiene certificadas sus reglas de cálculo
            contable.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {bloqueo?.trabajador ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Trabajador afectado
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              {bloqueo.trabajador}
            </p>
          </div>
        ) : (
          bloqueo && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-400">
              {bloqueo.mensajeOriginal}
            </p>
          )
        )}

        <p className="text-sm text-muted-foreground">
          Estos regímenes estarán disponibles cuando se validen sus reglas de
          cálculo.
        </p>

        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
