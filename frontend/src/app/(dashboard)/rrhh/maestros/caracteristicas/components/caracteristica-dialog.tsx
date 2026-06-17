'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Caracteristica } from '@/types/inventario';
import type { CaracteristicaFormData } from '../hooks/use-caracteristicas';

interface Props {
  open: boolean;
  caracteristica: Caracteristica | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CaracteristicaFormData) => Promise<boolean>;
}

function buildInitialForm(c: Caracteristica | null): CaracteristicaFormData {
  if (!c) return { nombre: '', descripcion: '' };
  return { nombre: c.nombre, descripcion: c.descripcion ?? '' };
}

export function CaracteristicaDialog({
  open,
  caracteristica,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  // El padre fuerza remount con `key`, así no hace falta useEffect de sync.
  const [form, setForm] = useState<CaracteristicaFormData>(() =>
    buildInitialForm(caracteristica),
  );

  const handleSubmit = async () => {
    const datos: CaracteristicaFormData = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || undefined,
    };
    const ok = await onSubmit(datos);
    if (ok) onOpenChange(false);
  };

  const canSubmit = form.nombre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {caracteristica ? 'Editar característica' : 'Nueva característica'}
          </DialogTitle>
          <DialogDescription>
            Atributo descriptivo libre de la prenda (material, color, costura,
            etc.). Saldrá en el cargo PDF que recibe el proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre <span className="text-red-600">*</span>
            </Label>
            <Input
              id="nombre"
              value={form.nombre}
              maxLength={120}
              placeholder="Ej: Drill azul marino, Anti-fluido, Costura reforzada"
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={3}
              maxLength={500}
              placeholder="Opcional. Detalle visible para el proveedor."
              className="resize-none"
              value={form.descripcion ?? ''}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {caracteristica ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
