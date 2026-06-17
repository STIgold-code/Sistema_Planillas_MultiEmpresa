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
import type { Proveedor } from '@/types/inventario';
import type { ProveedorFormData } from '../hooks/use-proveedores';

interface Props {
  open: boolean;
  proveedor: Proveedor | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProveedorFormData) => Promise<boolean>;
}

function buildInitialForm(proveedor: Proveedor | null): ProveedorFormData {
  if (!proveedor) {
    return { nombre: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '' };
  }
  return {
    nombre: proveedor.nombre,
    ruc: proveedor.ruc ?? '',
    contacto: proveedor.contacto ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
  };
}

export function ProveedorDialog({
  open,
  proveedor,
  saving,
  onOpenChange,
  onSubmit,
}: Props) {
  // Estado inicializado desde la prop; el padre fuerza remount con `key`.
  const [form, setForm] = useState<ProveedorFormData>(() =>
    buildInitialForm(proveedor),
  );
  const [errorRuc, setErrorRuc] = useState('');

  const handleSubmit = async () => {
    if (form.ruc && !/^\d{11}$/.test(form.ruc.trim())) {
      setErrorRuc('El RUC debe tener 11 dígitos');
      return;
    }
    const ok = await onSubmit(form);
    if (ok) onOpenChange(false);
  };

  const canSubmit = form.nombre.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
          </DialogTitle>
          <DialogDescription>
            Datos del proveedor de uniformes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre / Razón social <span className="text-red-600">*</span>
            </Label>
            <Input
              id="nombre"
              value={form.nombre}
              maxLength={200}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC</Label>
              <Input
                id="ruc"
                value={form.ruc}
                maxLength={11}
                inputMode="numeric"
                placeholder="11 dígitos"
                onChange={(e) => {
                  setForm({ ...form, ruc: e.target.value });
                  setErrorRuc('');
                }}
              />
              {errorRuc && <p className="text-xs text-red-600">{errorRuc}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                maxLength={20}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contacto">Contacto</Label>
              <Input
                id="contacto"
                value={form.contacto}
                maxLength={150}
                placeholder="Persona de contacto"
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                maxLength={150}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea
              id="direccion"
              rows={2}
              maxLength={300}
              className="resize-none"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {proveedor ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
