'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ESTADO_DESCUENTO_LABELS, type SolicitudDescuento } from '@/types/inventario';
import type { MontoItem } from '../hooks/use-descuentos';
import { bloquearTeclasDecimal } from '@/lib/numeric-input';

interface Props {
  solicitud: SolicitudDescuento | null;
  saving: boolean;
  onClose: () => void;
  onAprobar: (id: number, montos: MontoItem[], observaciones?: string) => Promise<boolean>;
  onRechazar: (id: number, observaciones?: string) => Promise<boolean>;
}

function formatMonto(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return `S/ ${Number(v).toFixed(2)}`;
}

export function AprobarDescuentoDialog({
  solicitud,
  saving,
  onClose,
  onAprobar,
  onRechazar,
}: Props) {
  // montos por item_id (string para el input controlado)
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState('');

  if (!solicitud) return null;

  const esPendiente = solicitud.estado === 'PENDIENTE';
  const nombreEmpleado = `${solicitud.empleado.apellido_paterno} ${solicitud.empleado.apellido_materno}, ${solicitud.empleado.nombres}`;

  const getMonto = (detalle: SolicitudDescuento['items'][number]): string => {
    if (montos[detalle.item_id] !== undefined) return montos[detalle.item_id];
    // default sugerido = precio de referencia
    return String(Number(detalle.precio_referencia));
  };

  const totalCalculado = solicitud.items.reduce(
    (acc, d) => acc + (parseFloat(getMonto(d)) || 0),
    0,
  );

  const handleAprobar = async () => {
    const payload: MontoItem[] = solicitud.items.map((d) => ({
      item_id: d.item_id,
      monto_descuento: parseFloat(getMonto(d)) || 0,
    }));
    const ok = await onAprobar(solicitud.id, payload, observaciones.trim() || undefined);
    if (ok) onClose();
  };

  const handleRechazar = async () => {
    const ok = await onRechazar(solicitud.id, observaciones.trim() || undefined);
    if (ok) onClose();
  };

  return (
    <Dialog open={solicitud !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitud de descuento #{solicitud.id}</DialogTitle>
          <DialogDescription>
            {nombreEmpleado} — DNI {solicitud.empleado.numero_documento}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ESTADO_DESCUENTO_LABELS[solicitud.estado]}</Badge>
            <span className="text-xs text-muted-foreground">
              Solicitado por {solicitud.solicitado_por.nombre_completo}
            </span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Motivo</p>
            <p className="text-sm bg-muted/30 rounded p-2 border whitespace-pre-wrap">
              {solicitud.motivo}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              {esPendiente ? 'Define el monto a descontar por item' : 'Items'}
            </Label>
            <ul className="space-y-1.5">
              {solicitud.items.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
                >
                  <span className="font-mono text-xs">{d.item.codigo}</span>
                  <span className="flex-1 truncate">
                    {d.item.tipo_uniforme.nombre} · {d.item.talla}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ref. {formatMonto(d.precio_referencia)}
                  </span>
                  {esPendiente ? (
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 w-24 text-sm"
                      value={getMonto(d)}
                      onKeyDown={bloquearTeclasDecimal}
                      onChange={(e) =>
                        setMontos((prev) => ({ ...prev, [d.item_id]: e.target.value }))
                      }
                    />
                  ) : (
                    <span className="font-medium tabular-nums w-24 text-right">
                      {formatMonto(d.monto_descuento)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm text-right border-t pt-2">
              Total a descontar:{' '}
              <strong>
                {esPendiente
                  ? `S/ ${totalCalculado.toFixed(2)}`
                  : formatMonto(solicitud.monto_total)}
              </strong>
            </p>
          </div>

          {esPendiente && (
            <div className="space-y-2">
              <Label className="text-sm">Observaciones (opcional)</Label>
              <Textarea
                rows={2}
                maxLength={500}
                className="resize-none"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          )}

          {!esPendiente && solicitud.observaciones_admin && (
            <div>
              <p className="text-xs text-muted-foreground">Observaciones del admin</p>
              <p className="text-sm">{solicitud.observaciones_admin}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          {esPendiente && (
            <>
              <Button variant="destructive" onClick={handleRechazar} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Rechazar
              </Button>
              <Button
                onClick={handleAprobar}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Aprobar descuento
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
