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
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  fechaCese: string | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EmpleadoCeseDialog({ open, fechaCese, onOpenChange, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmar fecha de cese
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Estás agregando una <strong>fecha de cese</strong> a este empleado.
              Esto lo marcará como <strong>cesado</strong> en el sistema.
            </p>
            <p className="text-sm text-muted-foreground">
              Fecha ingresada: {fechaCese}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancelar y quitar fecha
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-amber-600 hover:bg-amber-700">
            Sí, confirmar cese
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
