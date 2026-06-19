'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { bloquearTeclasEntero } from '@/lib/numeric-input';
import type {
  PlantillaUniforme,
  PlantillaUniformeFormData,
  TipoUniformeSelect,
} from '@/types/inventario';

interface Props {
  open: boolean;
  plantilla: PlantillaUniforme | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlantillaUniformeFormData) => Promise<boolean>;
}

interface ItemForm {
  tipo_uniforme_id: number;
  cantidad: number;
}

export function PlantillaDialog({
  open,
  plantilla,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '');
  const [predeterminada, setPredeterminada] = useState(
    plantilla?.predeterminada ?? false,
  );
  const [items, setItems] = useState<ItemForm[]>(
    plantilla?.items.map((i) => ({
      tipo_uniforme_id: i.tipo_uniforme_id,
      cantidad: i.cantidad,
    })) ?? [],
  );
  const [catalogo, setCatalogo] = useState<TipoUniformeSelect[]>([]);
  const [aAgregar, setAAgregar] = useState('');

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    api
      .get<TipoUniformeSelect[]>('/tipos-uniforme/select')
      .then((res) => vivo && setCatalogo(res))
      .catch(() => vivo && setCatalogo([]));
    return () => {
      vivo = false;
    };
  }, [open]);

  const nombrePorTipo = (id: number) =>
    catalogo.find((t) => t.id === id)?.nombre ?? `#${id}`;

  const yaAgregados = new Set(items.map((i) => i.tipo_uniforme_id));
  const disponibles = catalogo.filter((t) => !yaAgregados.has(t.id));

  const agregar = () => {
    const id = Number(aAgregar);
    if (!id || yaAgregados.has(id)) return;
    const tipo = catalogo.find((t) => t.id === id);
    setItems((prev) => [
      ...prev,
      { tipo_uniforme_id: id, cantidad: tipo?.cantidad_estandar ?? 1 },
    ]);
    setAAgregar('');
  };

  const quitar = (id: number) =>
    setItems((prev) => prev.filter((i) => i.tipo_uniforme_id !== id));

  const setCantidad = (id: number, cantidad: number) =>
    setItems((prev) =>
      prev.map((i) => (i.tipo_uniforme_id === id ? { ...i, cantidad } : i)),
    );

  const puedeGuardar = nombre.trim().length > 0 && items.length > 0 && !saving;

  const handleGuardar = async () => {
    const ok = await onSubmit({
      nombre: nombre.trim(),
      predeterminada,
      items: items.filter((i) => i.cantidad >= 1),
    });
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plantilla ? 'Editar plantilla' : 'Nueva plantilla de uniforme'}
          </DialogTitle>
          <DialogDescription>
            Define los artículos del uniforme y sus cantidades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Nombre <span className="text-red-600">*</span>
            </Label>
            <Input
              maxLength={120}
              placeholder="Ej: Uniforme Vigilante"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={predeterminada}
              onCheckedChange={(v) => setPredeterminada(v === true)}
            />
            Predeterminada (se aplica de un clic al cargar un empleado)
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Artículos <span className="text-red-600">*</span>
              </Label>
            </div>

            <div className="flex gap-2">
              <Select value={aAgregar} onValueChange={setAAgregar}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="Elegir artículo del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No quedan artículos por agregar
                    </div>
                  ) : (
                    disponibles.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={agregar}
                disabled={!aAgregar}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Sin artículos. Agrega al menos uno.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((i) => (
                  <li
                    key={i.tipo_uniforme_id}
                    className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                  >
                    <span className="flex-1">{nombrePorTipo(i.tipo_uniforme_id)}</span>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20 text-sm"
                      value={i.cantidad || ''}
                      onKeyDown={bloquearTeclasEntero}
                      onChange={(e) =>
                        setCantidad(
                          i.tipo_uniforme_id,
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label="Quitar"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => quitar(i.tipo_uniforme_id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={!puedeGuardar}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
