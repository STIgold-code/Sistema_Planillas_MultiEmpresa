'use client';

import { Loader2 } from 'lucide-react';
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
import { ContratoForm, Cliente, Sede, Cargo } from '../hooks/contratos.types';
import { PlantillaContrato } from '@/types';
import { RegimenLaboralField } from './RegimenLaboralField';

export interface ContratoRenovarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ContratoForm;
  setForm: (form: ContratoForm) => void;
  clientes: Cliente[];
  sedesFiltradas: Sede[];
  cargos: Cargo[];
  plantillas: PlantillaContrato[];
  saving: boolean;
  handleClienteChange: (value: string) => void;
  handleSedeChange: (value: string) => void;
  handleRenovarContrato: () => void;
}

export function ContratoRenovarDialog({
  open,
  onOpenChange,
  form,
  setForm,
  clientes,
  sedesFiltradas,
  cargos,
  plantillas,
  saving,
  handleClienteChange,
  handleSedeChange,
  handleRenovarContrato,
}: ContratoRenovarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle>Renovar Contrato</DialogTitle>
          <DialogDescription>
            Se creará un nuevo contrato y el actual se marcará como RENOVADO. Podrás ver el historial completo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
              <Label>Nueva Remuneración (S/.)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.remuneracion}
                onChange={(e) => setForm({ ...form, remuneracion: e.target.value })}
              />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={handleClienteChange}>
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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
              <Label>Cargo</Label>
              <Select
                value={form.cargo_id}
                onValueChange={(v) => setForm({ ...form, cargo_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mantener cargo actual" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RegimenLaboralField
              id="regimen_laboral_renovar"
              value={form.regimen_laboral}
              onChange={(v) => setForm({ ...form, regimen_laboral: v })}
            />
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
                placeholder="Motivo de renovación..."
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>

            {/* Generación de documento */}
            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Plantilla de Contrato</Label>
                <Select
                  value={form.plantilla_id}
                  onValueChange={(v) => setForm({ ...form, plantilla_id: v })}
                >
                  <SelectTrigger className="w-full">
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
                {plantillas.filter((p) => p.archivo_base_url).length === 0 && (
                  <p className="text-xs text-amber-600">
                    No hay plantillas con archivo Word. Vaya a RRHH → Plantillas Contrato y suba un archivo .docx a una plantilla existente o cree una nueva.
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generar_documento_renovar"
                  checked={form.generar_documento}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, generar_documento: checked as boolean })
                  }
                  disabled={!form.plantilla_id}
                />
                <Label htmlFor="generar_documento_renovar" className="text-sm font-normal cursor-pointer">
                  Generar y descargar documento PDF al renovar el contrato
                </Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 border-t shrink-0 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleRenovarContrato} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Renovar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
