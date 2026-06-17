'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import {
  GENERO_LABELS,
  type TipoUniforme,
  type CaracteristicaSelect,
} from '@/types/inventario';
import type { TipoUniformeFormData } from '../hooks/use-tipos-uniforme';

interface Props {
  open: boolean;
  tipo: TipoUniforme | null; // null = crear, objeto = editar
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TipoUniformeFormData) => Promise<boolean>;
}

function buildInitialForm(tipo: TipoUniforme | null): TipoUniformeFormData {
  if (!tipo) {
    return {
      nombre: '',
      descripcion: '',
      genero: 'UNISEX',
      precio_referencial: undefined,
      cantidad_estandar: 1,
      tallas: [],
      caracteristica_ids: [],
    };
  }
  return {
    nombre: tipo.nombre,
    descripcion: tipo.descripcion ?? '',
    genero: tipo.genero,
    precio_referencial: tipo.precio_referencial
      ? Number(tipo.precio_referencial)
      : undefined,
    cantidad_estandar: tipo.cantidad_estandar,
    // Precarga las tallas existentes (valor + stock mínimo) respetando el orden.
    tallas: [...tipo.tallas]
      .sort((a, b) => a.orden - b.orden)
      .map((t) => ({ valor: t.valor, stock_minimo: t.stock_minimo })),
    caracteristica_ids: (tipo.caracteristicas ?? []).map((c) => c.id),
  };
}

export function TipoUniformeDialog({
  open,
  tipo,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  // El estado se inicializa desde la prop. El padre fuerza remount con `key`
  // al abrir, así el form siempre arranca con los valores correctos sin
  // necesidad de un useEffect de sincronización.
  const [form, setForm] = useState<TipoUniformeFormData>(() =>
    buildInitialForm(tipo),
  );
  const [tallaInput, setTallaInput] = useState('');
  const [caracteristicas, setCaracteristicas] = useState<
    CaracteristicaSelect[]
  >([]);
  const [caracsOpen, setCaracsOpen] = useState(false);
  const [caracsBuscar, setCaracsBuscar] = useState('');

  // Carga el catálogo de características activas al abrir el dialog. Mantengo
  // la lista local para mostrar nombres en los badges incluso si el usuario
  // selecciona características que ya estaban marcadas en el tipo editado.
  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    api
      .get<CaracteristicaSelect[]>('/caracteristicas/select')
      .then((data) => {
        if (!cancelado) setCaracteristicas(data);
      })
      .catch(() => {
        // El listado vacío no impide el flujo; solo desaparece el selector.
      });
    return () => {
      cancelado = true;
    };
  }, [open]);

  // Mapa unificado: catálogo activo + las ya asociadas al tipo editado (que
  // pueden estar inactivas). Así los badges siempre muestran nombre y el usuario
  // puede quitarlas aunque ya no estén en el catálogo activo.
  const caracsConocidas: CaracteristicaSelect[] = (() => {
    const mapa = new Map<number, CaracteristicaSelect>();
    caracteristicas.forEach((c) => mapa.set(c.id, c));
    (tipo?.caracteristicas ?? []).forEach((c) => {
      if (!mapa.has(c.id))
        mapa.set(c.id, {
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion,
        });
    });
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  })();

  const caracsSeleccionadas = caracsConocidas.filter((c) =>
    form.caracteristica_ids.includes(c.id),
  );

  const caracsFiltradas = caracsBuscar.trim()
    ? caracteristicas.filter((c) =>
        c.nombre.toLowerCase().includes(caracsBuscar.trim().toLowerCase()),
      )
    : caracteristicas;

  const toggleCaracteristica = (id: number) => {
    setForm((prev) => ({
      ...prev,
      caracteristica_ids: prev.caracteristica_ids.includes(id)
        ? prev.caracteristica_ids.filter((cid) => cid !== id)
        : [...prev.caracteristica_ids, id],
    }));
  };

  const agregarTalla = () => {
    const valor = tallaInput.trim().toUpperCase();
    if (!valor) return;
    setForm((prev) =>
      prev.tallas.some((t) => t.valor === valor)
        ? prev
        : { ...prev, tallas: [...prev.tallas, { valor, stock_minimo: 0 }] },
    );
    setTallaInput('');
  };

  const quitarTalla = (valor: string) => {
    setForm((prev) => ({
      ...prev,
      tallas: prev.tallas.filter((t) => t.valor !== valor),
    }));
  };

  const setStockMinimo = (valor: string, stock_minimo: number) => {
    setForm((prev) => ({
      ...prev,
      tallas: prev.tallas.map((t) =>
        t.valor === valor ? { ...t, stock_minimo } : t,
      ),
    }));
  };

  const handleTallaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarTalla();
    }
  };

  const handleSubmit = async () => {
    const ok = await onSubmit(form);
    if (ok) onOpenChange(false);
  };

  const canSubmit = form.nombre.trim().length > 0 && form.cantidad_estandar >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tipo ? 'Editar tipo de uniforme' : 'Nuevo tipo de uniforme'}
          </DialogTitle>
          <DialogDescription>
            Define la prenda del catálogo de inventario.
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
              placeholder="Ej: Camisa, Pantalón Azul Masculino"
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Género</Label>
              <Select
                value={form.genero}
                onValueChange={(v) =>
                  setForm({ ...form, genero: v as TipoUniformeFormData['genero'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENERO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">
                Cantidad estándar <span className="text-red-600">*</span>
              </Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                value={form.cantidad_estandar}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cantidad_estandar: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio referencial (S/)</Label>
            <Input
              id="precio"
              type="number"
              min={0}
              step="0.01"
              placeholder="Opcional"
              value={form.precio_referencial ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  precio_referencial: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              rows={2}
              maxLength={300}
              placeholder="Opcional"
              className="resize-none"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="talla">Tallas y stock mínimo</Label>
            <div className="flex gap-2">
              <Input
                id="talla"
                value={tallaInput}
                maxLength={20}
                placeholder="Ej: S, M, L, XL"
                onChange={(e) => setTallaInput(e.target.value)}
                onKeyDown={handleTallaKeyDown}
              />
              <Button
                type="button"
                variant="outline"
                onClick={agregarTalla}
                disabled={!tallaInput.trim()}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Agregar talla</span>
              </Button>
            </div>
            {form.tallas.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {form.tallas.map((talla) => (
                  <div
                    key={talla.valor}
                    className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="flex-1 text-sm font-medium">
                      {talla.valor}
                    </span>
                    <Label
                      htmlFor={`min-${talla.valor}`}
                      className="text-xs text-muted-foreground"
                    >
                      Stock mín.
                    </Label>
                    <Input
                      id={`min-${talla.valor}`}
                      type="number"
                      min={0}
                      value={talla.stock_minimo}
                      onChange={(e) =>
                        setStockMinimo(
                          talla.valor,
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                      className="h-8 w-20 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => quitarTalla(talla.valor)}
                      className="rounded-full text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Quitar talla ${talla.valor}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Agrega las tallas disponibles y su stock mínimo. El mínimo dispara
                el aviso de faltante en la vista de stock (0 = sin aviso).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Características</Label>
            <Popover open={caracsOpen} onOpenChange={setCaracsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  <span className="text-muted-foreground">
                    {caracsSeleccionadas.length === 0
                      ? 'Agrega características a esta prenda'
                      : `${caracsSeleccionadas.length} seleccionada(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <div className="border-b p-2">
                  <Input
                    autoFocus
                    placeholder="Buscar característica..."
                    value={caracsBuscar}
                    onChange={(e) => setCaracsBuscar(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {caracsFiltradas.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No hay características{' '}
                      {caracsBuscar ? 'que coincidan' : 'activas'}. Créalas
                      desde Maestros → Características.
                    </p>
                  ) : (
                    caracsFiltradas.map((c) => {
                      const seleccionada = form.caracteristica_ids.includes(
                        c.id,
                      );
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCaracteristica(c.id)}
                          className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                        >
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary">
                            {seleccionada && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </span>
                          <span className="flex-1">
                            <span className="block font-medium">
                              {c.nombre}
                            </span>
                            {c.descripcion && (
                              <span className="block text-xs text-muted-foreground">
                                {c.descripcion}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {caracsSeleccionadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {caracsSeleccionadas.map((c) => (
                  <Badge
                    key={c.id}
                    variant="secondary"
                    className="gap-1 pl-2 pr-1"
                  >
                    {c.nombre}
                    <button
                      type="button"
                      onClick={() => toggleCaracteristica(c.id)}
                      className="rounded-full transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Quitar ${c.nombre}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Las características salen en el cargo PDF debajo de cada prenda
              cuando se envía el requerimiento al proveedor.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tipo ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
