'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toDateString } from '@/lib/utils';
import type { TipoUniformeSelect } from '@/types/inventario';
import type { CrearEntregaData, LineaEntrega } from '../hooks/use-entregas';
import { EmpleadoSelector } from '../../shared/empleado-selector';
import { LineaEntregaRow } from './linea-entrega-row';

interface Props {
  open: boolean;
  saving: boolean;
  tipos: TipoUniformeSelect[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CrearEntregaData) => Promise<boolean>;
}

const LINEA_VACIA: LineaEntrega = {
  tipo_uniforme_id: 0,
  talla: '',
  cantidad: 1,
};

export function EntregarDialog({
  open,
  saving,
  tipos,
  onOpenChange,
  onSubmit,
}: Props) {
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const [empleadoNombre, setEmpleadoNombre] = useState('');
  const [fecha, setFecha] = useState(toDateString(new Date()));
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<LineaEntrega[]>([{ ...LINEA_VACIA }]);

  const reset = () => {
    setEmpleadoId(null);
    setEmpleadoNombre('');
    setFecha(toDateString(new Date()));
    setObservaciones('');
    setLineas([{ ...LINEA_VACIA }]);
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const updateLinea = (index: number, linea: LineaEntrega) =>
    setLineas((prev) => prev.map((l, i) => (i === index ? linea : l)));
  const addLinea = () => setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  const removeLinea = (index: number) =>
    setLineas((prev) => prev.filter((_, i) => i !== index));

  const lineasValidas = lineas.filter(
    (l) => l.tipo_uniforme_id > 0 && l.talla.trim() && l.cantidad >= 1,
  );
  const totalItems = lineasValidas.reduce((acc, l) => acc + l.cantidad, 0);
  const canSubmit = !!empleadoId && !!fecha && lineasValidas.length > 0;

  const handleSubmit = async () => {
    if (!empleadoId) return;
    const ok = await onSubmit({
      empleado_id: empleadoId,
      fecha_entrega: fecha,
      observaciones: observaciones.trim() || undefined,
      lineas: lineasValidas.map((l) => ({ ...l, talla: l.talla.trim() })),
    });
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entregar uniformes</DialogTitle>
          <DialogDescription>
            El sistema asignará automáticamente items disponibles del stock para
            cada línea.
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

          <div className="space-y-2 max-w-xs">
            <Label>
              Fecha de entrega <span className="text-red-600">*</span>
            </Label>
            <Input
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Prendas a entregar <span className="text-red-600">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addLinea}>
                <Plus className="mr-1 h-3 w-3" />
                Agregar línea
              </Button>
            </div>
            <div className="space-y-2">
              {lineas.map((linea, index) => (
                <LineaEntregaRow
                  key={index}
                  linea={linea}
                  tipos={tipos}
                  index={index}
                  onChange={updateLinea}
                  onRemove={removeLinea}
                  removable={lineas.length > 1}
                />
              ))}
            </div>
            {lineasValidas.length > 0 && (
              <p className="text-sm text-muted-foreground text-right border-t pt-2 mt-2">
                Total a entregar: <strong>{totalItems}</strong> prendas
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              rows={2}
              maxLength={500}
              className="resize-none"
              placeholder="Opcional"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
