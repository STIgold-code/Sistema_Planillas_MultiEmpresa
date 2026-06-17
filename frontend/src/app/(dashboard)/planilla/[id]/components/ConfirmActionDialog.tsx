'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { ConfirmAction } from '../types';

interface ConfirmActionDialogProps {
  confirmAction: ConfirmAction;
  approving: boolean;
  paying: boolean;
  canceling: boolean;
  onClose: () => void;
  onAprobar: () => void;
  onPagar: () => void;
  onAnular: () => void;
}

export function ConfirmActionDialog({
  confirmAction,
  approving,
  paying,
  canceling,
  onClose,
  onAprobar,
  onPagar,
  onAnular,
}: ConfirmActionDialogProps) {
  const handleConfirm = () => {
    if (confirmAction === 'aprobar') onAprobar();
    if (confirmAction === 'pagar') onPagar();
    if (confirmAction === 'anular') onAnular();
  };

  return (
    <AlertDialog open={!!confirmAction} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg md:text-xl">
            {confirmAction === 'aprobar' && 'Aprobar Planilla'}
            {confirmAction === 'pagar' && 'Marcar como Pagada'}
            {confirmAction === 'anular' && 'Anular Planilla'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {confirmAction === 'aprobar' && 'Esta seguro de aprobar esta planilla? Una vez aprobada, no podra editarla.'}
            {confirmAction === 'pagar' && 'Esta seguro de marcar esta planilla como pagada?'}
            {confirmAction === 'anular' && 'Esta seguro de anular esta planilla? Esta accion no se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={confirmAction === 'anular' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {(approving || paying || canceling) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Confirmar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
