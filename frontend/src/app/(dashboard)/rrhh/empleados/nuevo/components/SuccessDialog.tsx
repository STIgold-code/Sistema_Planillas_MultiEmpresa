'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IdCard, FileText, Users } from 'lucide-react';
import { Empleado } from '@/types';

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdEmpleado: Empleado | null;
  onOpenPhotocheck: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  createdEmpleado,
  onOpenPhotocheck,
}: SuccessDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            Empleado creado con exito
          </DialogTitle>
          <DialogDescription className="text-sm">
            {createdEmpleado && (
              <span className="font-medium text-foreground">
                {createdEmpleado.nombres} {createdEmpleado.apellido_paterno}{' '}
                {createdEmpleado.apellido_materno}
              </span>
            )}{' '}
            ha sido registrado en el sistema. Seleccione una accion:
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            variant="default"
            className="w-full justify-start h-auto py-3"
            onClick={() => {
              onOpenChange(false);
              onOpenPhotocheck();
            }}
          >
            <IdCard className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Generar Photocheck</div>
              <div className="text-xs text-primary-foreground/70">
                Crear e imprimir credencial del empleado
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => {
              onOpenChange(false);
              if (createdEmpleado) {
                router.push(`/rrhh/contratos/nuevo?empleado_id=${createdEmpleado.id}`);
              }
            }}
          >
            <FileText className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Crear Contrato</div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Generar contrato laboral
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => {
              onOpenChange(false);
              if (createdEmpleado) {
                router.push(`/rrhh/empleados/${createdEmpleado.id}`);
              }
            }}
          >
            <Users className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Ver Empleado</div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Ir al detalle del empleado
              </div>
            </div>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              router.push('/rrhh/empleados');
            }}
          >
            Ir al listado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
