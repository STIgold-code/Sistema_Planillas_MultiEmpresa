'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toDateString } from '@/lib/utils';
import type {
  TipoUniformeSelect,
  ProveedorSelect,
} from '@/types/inventario';
import type { CrearIngresoData, LineaIngreso } from '../hooks/use-ingresos';
import { LineaIngresoRow } from './linea-ingreso-row';

interface Props {
  open: boolean;
  saving: boolean;
  tipos: TipoUniformeSelect[];
  proveedores: ProveedorSelect[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CrearIngresoData) => Promise<boolean>;
  /**
   * Valores iniciales para prellenar el formulario (p. ej. al generar la
   * compra desde un requerimiento). El padre debe forzar el remount con `key`
   * cuando cambie, ya que se usa solo en la inicialización del estado.
   */
  inicial?: { proveedorId?: string; lineas?: LineaIngreso[] };
}

const LINEA_VACIA: LineaIngreso = {
  tipo_uniforme_id: 0,
  talla: '',
  cantidad: 1,
  precio_unitario: 0,
};

const lineasIniciales = (inicial?: Props['inicial']): LineaIngreso[] =>
  inicial?.lineas && inicial.lineas.length > 0
    ? inicial.lineas.map((l) => ({ ...l }))
    : [{ ...LINEA_VACIA }];

export function RegistrarCompraDialog({
  open,
  saving,
  tipos,
  proveedores,
  onOpenChange,
  onSubmit,
  inicial,
}: Props) {
  const [proveedorId, setProveedorId] = useState(() => inicial?.proveedorId ?? '');
  const [fecha, setFecha] = useState(toDateString(new Date()));
  const [numeroDoc, setNumeroDoc] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<LineaIngreso[]>(() =>
    lineasIniciales(inicial),
  );

  const reset = () => {
    setProveedorId(inicial?.proveedorId ?? '');
    setFecha(toDateString(new Date()));
    setNumeroDoc('');
    setObservaciones('');
    setLineas(lineasIniciales(inicial));
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const updateLinea = (index: number, linea: LineaIngreso) =>
    setLineas((prev) => prev.map((l, i) => (i === index ? linea : l)));

  const addLinea = () => setLineas((prev) => [...prev, { ...LINEA_VACIA }]);

  const removeLinea = (index: number) =>
    setLineas((prev) => prev.filter((_, i) => i !== index));

  const lineasValidas = lineas.filter(
    (l) =>
      l.tipo_uniforme_id > 0 &&
      l.talla.trim() &&
      l.cantidad >= 1 &&
      l.precio_unitario >= 0,
  );

  const totalItems = lineasValidas.reduce((acc, l) => acc + l.cantidad, 0);
  const totalCosto = lineasValidas.reduce(
    (acc, l) => acc + l.cantidad * l.precio_unitario,
    0,
  );

  const canSubmit = !!proveedorId && !!fecha && lineasValidas.length > 0;

  const handleSubmit = async () => {
    const ok = await onSubmit({
      proveedor_id: Number(proveedorId),
      fecha_ingreso: fecha,
      numero_documento: numeroDoc.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      lineas: lineasValidas.map((l) => ({
        ...l,
        talla: l.talla.trim(),
      })),
    });
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>
            Registra el ingreso de prendas al stock. El sistema generará un item
            individual con código por cada unidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Proveedor <span className="text-red-600">*</span>
              </Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Fecha <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                min="2020-01-01"
                max="2100-12-31"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>N° de documento (factura/guía)</Label>
              <Input
                maxLength={50}
                placeholder="Opcional"
                value={numeroDoc}
                onChange={(e) => setNumeroDoc(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Prendas <span className="text-red-600">*</span>
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addLinea}>
                <Plus className="mr-1 h-3 w-3" />
                Agregar línea
              </Button>
            </div>
            <div className="space-y-2">
              {lineas.map((linea, index) => (
                <LineaIngresoRow
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
              <div className="flex items-center justify-end gap-4 pt-2 text-sm border-t mt-2">
                <span className="text-muted-foreground">
                  Total items: <strong>{totalItems}</strong>
                </span>
                <span className="text-muted-foreground">
                  Costo total: <strong>S/ {totalCosto.toFixed(2)}</strong>
                </span>
              </div>
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
            Registrar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
