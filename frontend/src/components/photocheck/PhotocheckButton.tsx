'use client';

import { useState } from 'react';
import { Empleado } from '@/types';
import { PhotocheckPreview } from './PhotocheckPreview';
import { Button } from '@/components/ui/button';
import { IdCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';

interface PhotocheckButtonProps {
  empleado: Empleado;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function PhotocheckButton({
  empleado,
  variant = 'outline',
  size = 'default',
  className,
}: PhotocheckButtonProps) {
  const [open, setOpen] = useState(false);
  const { empresa } = useEmpresa();

  const handleGenerated = async () => {
    // Registrar log de generacion en backend
    try {
      await api.post(`/empleados/${empleado.id}/photocheck-log`, {
        motivo: 'NUEVO',
      });
    } catch (error) {
      // No bloquear si falla el log
      console.error('Error al registrar log de photocheck:', error);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <IdCard className="mr-2 h-4 w-4" />
        Photocheck
      </Button>

      <PhotocheckPreview
        open={open}
        onOpenChange={setOpen}
        empleado={empleado}
        empresaLogo={empresa?.logo_url}
        empresaNombre={empresa?.nombre_comercial || empresa?.razon_social}
        empresaTelefono={empresa?.telefono}
        centroControl={empresa?.centro_control}
        onGenerated={handleGenerated}
      />
    </>
  );
}
