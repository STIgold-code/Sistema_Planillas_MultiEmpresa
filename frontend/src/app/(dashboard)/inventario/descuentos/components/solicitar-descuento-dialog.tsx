'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { EmpleadoSelector } from '../../shared/empleado-selector';
import type { ItemsPendientesEmpleado } from '@/types/inventario';
import type { CrearDescuentoData } from '../hooks/use-descuentos';

interface Props {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CrearDescuentoData) => Promise<boolean>;
}

function formatPrecio(precio: number | string): string {
  return `S/ ${Number(precio).toFixed(2)}`;
}

export function SolicitarDescuentoDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [empleadoNombre, setEmpleadoNombre] = useState('');
  const [pendientes, setPendientes] = useState<ItemsPendientesEmpleado | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!empleadoId) return;
    let activo = true;
    (async () => {
      setCargando(true);
      try {
        const res = await api.get<ItemsPendientesEmpleado>(
          `/inventario/empleados/${empleadoId}/pendientes`,
        );
        if (activo) {
          setPendientes(res);
          setSeleccion(new Set());
        }
      } catch {
        if (activo) setPendientes(null);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [empleadoId]);

  const reset = () => {
    setEmpleadoId(null);
    setEmpleadoNombre('');
    setPendientes(null);
    setSeleccion(new Set());
    setMotivo('');
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const toggle = (id: number) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    !!empleadoId && motivo.trim().length >= 5 && seleccion.size > 0;

  const handleSubmit = async () => {
    if (!empleadoId) return;
    const ok = await onSubmit({
      empleado_id: empleadoId,
      motivo: motivo.trim(),
      item_ids: [...seleccion],
    });
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar descuento</DialogTitle>
          <DialogDescription>
            Selecciona los uniformes no devueltos. El administrador definirá el
            monto a descontar al aprobar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Empleado <span className="text-red-600">*</span>
            </Label>
            <EmpleadoSelector
              selectedId={empleadoId}
              onSelect={(e) => {
                setEmpleadoId(e.id);
                setEmpleadoNombre(
                  `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
                );
              }}
            />
            {empleadoId && (
              <p className="text-xs text-green-700">Seleccionado: {empleadoNombre}</p>
            )}
          </div>

          {empleadoId && (
            <div className="space-y-2">
              <Label>Uniformes sin devolver</Label>
              {cargando ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !pendientes || pendientes.total === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Este empleado no tiene uniformes pendientes de devolución.
                </p>
              ) : (
                <ul className="space-y-1">
                  {pendientes.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={seleccion.has(item.id)}
                        onCheckedChange={() => toggle(item.id)}
                      />
                      <Shirt className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-xs">{item.codigo}</span>
                      <span className="flex-1 truncate">
                        {item.tipo_uniforme.nombre} · {item.talla}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPrecio(item.precio)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Motivo <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={2}
              maxLength={500}
              className="resize-none"
              placeholder="Ej: empleado cesado no devolvió uniformes..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Mínimo 5 caracteres.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
