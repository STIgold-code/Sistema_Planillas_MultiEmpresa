'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';

interface HistorialDialogProps {
  open: boolean;
  loading: boolean;
  historial: any[];
  onClose: () => void;
}

export function HistorialDialog({ open, loading, historial, onClose }: HistorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de Cambios
          </DialogTitle>
          <DialogDescription className="text-sm">
            Registro de modificaciones en esta celda
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-center text-xs md:text-sm text-muted-foreground py-4">Sin historial de cambios</p>
          ) : (
            <div className="space-y-2">
              {historial.map((item, i) => (
                <div key={i} className="border rounded p-2 text-sm">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="font-mono bg-red-100 px-1 rounded line-through">{item.valor_anterior || '-'}</span>
                      <span className="mx-2">→</span>
                      <span className="font-mono bg-green-100 px-1 rounded">{item.valor_nuevo || '-'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString('es-PE')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por: {item.usuario?.nombre_completo || 'Sistema'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
