'use client';

import { ConfiguracionTareoPanel } from '@/components/tareo';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ConfiguracionTareoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuración de Tareo</h1>
          <p className="text-sm text-muted-foreground">
            Configura los parámetros de control de sesiones para la edición del tareo
          </p>
        </div>
      </div>

      <div className="flex-1">
        <ConfiguracionTareoPanel />
      </div>
    </div>
  );
}
