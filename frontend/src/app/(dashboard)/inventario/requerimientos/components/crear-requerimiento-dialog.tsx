'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toDateString } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ProveedorSelect } from '@/types/inventario';

interface Props {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    nombre: string,
    fecha: string,
    proveedor_id?: number,
  ) => Promise<boolean>;
}

const SIN_PROVEEDOR = 'NINGUNO';

export function CrearRequerimientoDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(toDateString(new Date()));
  const [proveedorId, setProveedorId] = useState<string>(SIN_PROVEEDOR);
  const [proveedores, setProveedores] = useState<ProveedorSelect[]>([]);

  // Carga los proveedores activos para el selector al abrir el diálogo.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    api
      .get<ProveedorSelect[]>('/proveedores/select')
      .then((res) => {
        if (vivo) setProveedores(res);
      })
      .catch(() => {
        if (vivo) setProveedores([]);
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setNombre('');
    setFecha(toDateString(new Date()));
    setProveedorId(SIN_PROVEEDOR);
  };

  const handleSubmit = async () => {
    const proveedor_id =
      proveedorId !== SIN_PROVEEDOR ? Number(proveedorId) : undefined;
    const ok = await onSubmit(nombre.trim(), fecha, proveedor_id);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo requerimiento</DialogTitle>
          <DialogDescription>
            Crea un requerimiento de prendas para empezar a cargar empleados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre <span className="text-red-600">*</span>
            </Label>
            <Input
              id="nombre"
              maxLength={200}
              placeholder="Ej: Requerimiento Uniformes 2026"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="fecha">
              Fecha <span className="text-red-600">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre}
                    {p.ruc ? ` · ${p.ruc}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A quién se le comprarán las prendas. Podés elegirlo ahora o
              después.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || nombre.trim().length < 3 || !fecha}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
