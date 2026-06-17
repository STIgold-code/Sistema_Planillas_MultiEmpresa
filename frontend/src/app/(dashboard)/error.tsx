'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log del error para debugging (en producción usar servicio de monitoreo)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <div className="flex items-center gap-3 text-destructive">
        <AlertCircle className="h-10 w-10" />
        <h2 className="text-2xl font-semibold">Algo salió mal</h2>
      </div>

      <p className="text-muted-foreground text-center max-w-md">
        Ocurrió un error inesperado. Por favor intenta de nuevo o contacta al
        administrador si el problema persiste.
      </p>

      {error.message && (
        <div className="bg-muted p-4 rounded-md max-w-md w-full">
          <p className="text-sm text-muted-foreground font-mono break-words">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
