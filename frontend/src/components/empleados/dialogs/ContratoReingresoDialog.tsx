'use client';

import { Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ContratoForm, Cliente, Sede } from '../hooks/contratos.types';
import { PlantillaContrato } from '@/types';

const TIPOS_CONTRATO = [
  { value: 'SUJETO_A_MODALIDAD', label: 'Sujeto a Modalidad' },
  { value: 'INDEFINIDO', label: 'Indefinido' },
  { value: 'LOCACION', label: 'Locación de Servicios' },
  { value: 'OBRA_SERVICIO', label: 'Obra o Servicio' },
  { value: 'TIEMPO_PARCIAL', label: 'Tiempo Parcial' },
];

const MODALIDADES = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'REMOTO', label: 'Remoto' },
  { value: 'HIBRIDO', label: 'Híbrido' },
];

export interface ContratoReingresoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ContratoForm;
  setForm: (form: ContratoForm) => void;
  clientes: Cliente[];
  sedesFiltradas: Sede[];
  plantillas: PlantillaContrato[];
  saving: boolean;
  handleClienteChange: (value: string) => void;
  handleSedeChange: (value: string) => void;
  handleReingreso: () => void;
}

export function ContratoReingresoDialog({
  open,
  onOpenChange,
  form,
  setForm,
  clientes,
  sedesFiltradas,
  plantillas,
  saving,
  handleClienteChange,
  handleSedeChange,
  handleReingreso,
}: ContratoReingresoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reingreso de Empleado</DialogTitle>
          <DialogDescription>
            Se creará un nuevo contrato y el empleado pasará de BAJA a ACTIVO.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de Contrato *</Label>
              <Select
                value={form.tipo_contrato}
                onValueChange={(v) => setForm({ ...form, tipo_contrato: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CONTRATO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modalidad</Label>
              <Select
                value={form.modalidad}
                onValueChange={(v) => setForm({ ...form, modalidad: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Inicio *</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Remuneracion (S/.)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.remuneracion}
              onChange={(e) => setForm({ ...form, remuneracion: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sede</Label>
              <Select
                value={form.sede_id}
                onValueChange={handleSedeChange}
                disabled={!form.cliente_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.cliente_id ? "Seleccione una sede" : "Primero seleccione cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {sedesFiltradas.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lugar de Trabajo</Label>
            <Input
              placeholder="Se auto-completa al seleccionar sede"
              value={form.lugar_trabajo}
              onChange={(e) => setForm({ ...form, lugar_trabajo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Motivo de reingreso..."
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>

          {/* Generacion de documento */}
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Plantilla de Contrato</Label>
              <Select
                value={form.plantilla_id}
                onValueChange={(v) => setForm({ ...form, plantilla_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {plantillas
                    .filter((p) => p.archivo_base_url)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.nombre} {p.es_predeterminada && '(Predeterminada)'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generar_documento_reingreso"
                checked={form.generar_documento}
                onCheckedChange={(checked) =>
                  setForm({ ...form, generar_documento: checked as boolean })
                }
                disabled={!form.plantilla_id}
              />
              <Label htmlFor="generar_documento_reingreso" className="text-sm font-normal cursor-pointer">
                Generar y descargar documento Word al crear el contrato
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReingreso} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <UserCheck className="mr-2 h-4 w-4" />
            Procesar Reingreso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
