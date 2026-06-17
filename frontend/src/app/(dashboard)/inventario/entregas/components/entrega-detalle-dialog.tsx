'use client';

import { useState } from 'react';
import { Loader2, Undo2, FileSpreadsheet, Ban } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/utils';
import { descargarArchivo } from '../../shared/descargar-archivo';
import {
  ESTADO_ITEM_LABELS,
  type EntregaUniforme,
} from '@/types/inventario';

type CondicionRetorno = 'BUENA' | 'DANADA';

interface Props {
  entrega: EntregaUniforme | null;
  devolviendo: boolean;
  onClose: () => void;
  onDevolver: (
    itemIds: number[],
    condicion: CondicionRetorno,
  ) => Promise<boolean>;
}

export function EntregaDetalleDialog({
  entrega,
  devolviendo,
  onClose,
  onDevolver,
}: Props) {
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [descargando, setDescargando] = useState(false);

  if (!entrega) return null;

  const exportar = async () => {
    setDescargando(true);
    try {
      await descargarArchivo(
        `/inventario/entregas/${entrega.id}/export/excel`,
        `Entrega_${entrega.id}.xlsx`,
      );
    } catch {
      toast.error('No se pudo descargar el Excel');
    } finally {
      setDescargando(false);
    }
  };

  const itemsEntregados = (entrega.items ?? []).filter(
    (i) => i.estado === 'ENTREGADO',
  );

  const toggle = (id: number) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDevolver = async (condicion: CondicionRetorno) => {
    if (seleccion.size === 0) return;
    const ok = await onDevolver([...seleccion], condicion);
    if (ok) {
      setSeleccion(new Set());
      onClose();
    }
  };

  const nombreEmpleado = `${entrega.empleado.apellido_paterno} ${entrega.empleado.apellido_materno}, ${entrega.empleado.nombres}`;

  return (
    <Dialog open={entrega !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entrega #{entrega.id}</DialogTitle>
          <DialogDescription>{nombreEmpleado}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">DNI</dt>
              <dd className="font-mono">{entrega.empleado.numero_documento}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Entregado por</dt>
              <dd>{entrega.entregado_por.nombre_completo}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fecha de entrega</dt>
              <dd>{formatDateSafe(entrega.fecha_entrega)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Hora de registro</dt>
              <dd>{formatDateTimeSafe(entrega.created_at)}</dd>
            </div>
            {entrega.observaciones && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Observaciones</dt>
                <dd>{entrega.observaciones}</dd>
              </div>
            )}
          </dl>

          <p className="text-xs text-muted-foreground">
            Marca los items que el empleado devuelve. Si están en buen estado
            vuelven al stock como usados; si están dañados se dan de baja.
          </p>

          <ul className="space-y-1">
            {(entrega.items ?? []).map((item) => {
              const devolvible = item.estado === 'ENTREGADO';
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
                >
                  <Checkbox
                    checked={seleccion.has(item.id)}
                    disabled={!devolvible}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <span className="font-mono text-xs">{item.codigo}</span>
                  <span className="flex-1 truncate">
                    {item.tipo_uniforme.nombre} · {item.talla}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      devolvible
                        ? 'text-xs bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-xs bg-green-50 text-green-700 border-green-200'
                    }
                  >
                    {ESTADO_ITEM_LABELS[item.estado]}
                  </Badge>
                </li>
              );
            })}
          </ul>

          {itemsEntregados.length === 0 && (
            <p className="text-sm text-green-700 italic">
              Todos los items de esta entrega ya fueron devueltos.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={exportar}
            disabled={descargando}
            className="sm:mr-auto"
          >
            {descargando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={onClose} disabled={devolviendo}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDevolver('DANADA')}
            disabled={devolviendo || seleccion.size === 0}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Ban className="mr-2 h-4 w-4" />
            Dar de baja {seleccion.size > 0 ? `(${seleccion.size})` : ''}
          </Button>
          <Button
            onClick={() => handleDevolver('BUENA')}
            disabled={devolviendo || seleccion.size === 0}
          >
            {devolviendo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-4 w-4" />
            )}
            Devolver al stock {seleccion.size > 0 ? `(${seleccion.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
