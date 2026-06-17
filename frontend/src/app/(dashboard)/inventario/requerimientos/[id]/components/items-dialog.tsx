'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { bloquearTeclasEntero } from '@/lib/numeric-input';
import type { LineaItem, TipoUniformeSelect } from '@/types/inventario';

/** Fila editable del diálogo (puede tener prenda/talla a medio elegir). */
interface FilaItem {
  tipo_uniforme_id: number | null;
  talla: string;
  cantidad: number;
}

interface Props {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  /** Catálogo de prendas activas con sus tallas (useInventarioSelects). */
  tipos: TipoUniformeSelect[];
  /**
   * Líneas de ítems ya guardadas para precargar la lista en edición. El padre
   * remonta el diálogo (vía `key`) al abrir, por lo que estas se leen una vez
   * en el estado inicial — sin efecto que sincronice props con estado.
   */
  inicial: LineaItem[];
  onGuardar: (lineas: LineaItem[]) => Promise<boolean>;
}

function filaVacia(): FilaItem {
  return { tipo_uniforme_id: null, talla: '', cantidad: 1 };
}

function filasIniciales(inicial: LineaItem[]): FilaItem[] {
  if (inicial.length === 0) return [filaVacia()];
  return inicial.map((l) => ({
    tipo_uniforme_id: l.tipo_uniforme_id,
    talla: l.talla,
    cantidad: l.cantidad,
  }));
}

export function ItemsDialog({
  open,
  saving,
  onOpenChange,
  tipos,
  inicial,
  onGuardar,
}: Props) {
  const [filas, setFilas] = useState<FilaItem[]>(() => filasIniciales(inicial));

  const tallasDeTipo = (tipoId: number | null): string[] => {
    if (tipoId === null) return [];
    const tipo = tipos.find((t) => t.id === tipoId);
    return tipo ? tipo.tallas.map((x) => x.valor) : [];
  };

  const updateFila = (idx: number, patch: Partial<FilaItem>) =>
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  // Al cambiar de prenda, resetea la talla si ya no es válida para la nueva.
  const cambiarTipo = (idx: number, valor: string) => {
    const tipoId = Number(valor);
    const tallasValidas = tallasDeTipo(tipoId);
    setFilas((prev) =>
      prev.map((f, i) =>
        i === idx
          ? {
              ...f,
              tipo_uniforme_id: tipoId,
              talla: tallasValidas.includes(f.talla) ? f.talla : '',
            }
          : f,
      ),
    );
  };

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()]);

  const quitarFila = (idx: number) =>
    setFilas((prev) =>
      prev.length === 1 ? [filaVacia()] : prev.filter((_, i) => i !== idx),
    );

  // Líneas válidas: prenda elegida, talla no vacía y cantidad >= 1.
  const lineasValidas: LineaItem[] = filas
    .filter(
      (f) => f.tipo_uniforme_id !== null && f.talla.trim() && f.cantidad >= 1,
    )
    .map((f) => ({
      tipo_uniforme_id: f.tipo_uniforme_id as number,
      talla: f.talla.trim(),
      cantidad: f.cantidad,
    }));

  const handleGuardar = async () => {
    const ok = await onGuardar(lineasValidas);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar ítems (lista de compra)</DialogTitle>
          <DialogDescription>
            Arma la lista de prendas a comprar sin asociarlas a un empleado.
            Elige la prenda, la talla y la cantidad. Guardar reemplaza la lista
            de ítems actual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span className="col-span-6">Prenda</span>
            <span className="col-span-3">Talla</span>
            <span className="col-span-2">Cantidad</span>
            <span className="col-span-1" />
          </div>

          {filas.map((f, idx) => {
            const tallasTipo = tallasDeTipo(f.tipo_uniforme_id);
            const sinPrenda = f.tipo_uniforme_id === null;
            const sinTallas = !sinPrenda && tallasTipo.length === 0;
            return (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-6">
                  <Select
                    value={
                      f.tipo_uniforme_id !== null
                        ? String(f.tipo_uniforme_id)
                        : ''
                    }
                    onValueChange={(v) => cambiarTipo(idx, v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Elige una prenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Select
                    value={f.talla || ''}
                    disabled={sinPrenda || sinTallas}
                    onValueChange={(v) => updateFila(idx, { talla: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue
                        placeholder={
                          sinPrenda
                            ? 'Talla'
                            : sinTallas
                              ? 'Sin tallas'
                              : 'Talla'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tallasTipo.map((tv) => (
                        <SelectItem key={tv} value={tv}>
                          {tv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="col-span-2 h-8 text-sm"
                  type="number"
                  min={1}
                  value={f.cantidad || ''}
                  onKeyDown={bloquearTeclasEntero}
                  onChange={(e) =>
                    updateFila(idx, {
                      cantidad: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => quitarFila(idx)}
                  aria-label="Quitar ítem"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={agregarFila}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Agregar ítem
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar {lineasValidas.length > 0 ? `(${lineasValidas.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
