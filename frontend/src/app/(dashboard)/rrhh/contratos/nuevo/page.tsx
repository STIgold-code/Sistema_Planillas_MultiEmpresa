'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NuevoContratoPage() {
  const router = useRouter();

  useEffect(() => {
    toast.info('Para crear un contrato, ve a la ficha del empleado → Tab Contratos');
    router.replace('/rrhh/contratos');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-96 gap-2 md:gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Redirigiendo...</p>
    </div>
  );
}
