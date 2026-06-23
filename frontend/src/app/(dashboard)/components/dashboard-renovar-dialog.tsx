'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';
import type {
  Cliente,
  Sede,
  PlantillaContrato,
  Cargo,
  RenovarForm,
  EmpleadoPendiente,
  ContratoPorVencer,
} from '../useDashboard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoARenovar: EmpleadoPendiente | ContratoPorVencer | null;
  renovarForm: RenovarForm;
  setRenovarForm: React.Dispatch<React.SetStateAction<RenovarForm>>;
  clientes: Cliente[];
  sedesFiltradas: Sede[];
  plantillas: PlantillaContrato[];
  cargos: Cargo[];
  renovando: boolean;
  onClienteChange: (clienteId: string) => void;
  onRenovar: () => void;
  onClose: () => void;
}

export function DashboardRenovarDialog({
  open,
  onOpenChange,
  contratoARenovar,
  renovarForm,
  setRenovarForm,
  clientes,
  sedesFiltradas,
  plantillas,
  cargos,
  renovando,
  onClienteChange,
  onRenovar,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Renovar Contrato</DialogTitle>
          {contratoARenovar && (
            <DialogDescription>
              {contratoARenovar.nombreCompleto} - {contratoARenovar.empleado.numero_documento}
            </DialogDescription>
          )}
        </DialogHeader>

        {contratoARenovar && (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Info contrato actual */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-xs text-muted-foreground mb-2">Contrato actual (vencido)</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-medium text-xs sm:text-sm">{contratoARenovar.tipo_contrato}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Modalidad</p>
                  <p className="font-medium text-xs sm:text-sm">{contratoARenovar.modalidad || 'PRESENCIAL'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha Inicio</p>
                  <p className="font-medium text-xs sm:text-sm">{formatDateSafe(contratoARenovar.fecha_inicio)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha Fin</p>
                  <p className="font-medium text-xs sm:text-sm text-red-600">{formatDateSafe(contratoARenovar.fecha_fin)}</p>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Nueva Fecha Inicio *</Label>
                  <Input
                    type="date"
                    value={renovarForm.fecha_inicio}
                    onChange={(e) => setRenovarForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Nueva Fecha Fin *</Label>
                  <Input
                    type="date"
                    value={renovarForm.fecha_fin}
                    onChange={(e) => setRenovarForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Remuneración</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={renovarForm.remuneracion}
                  onChange={(e) => setRenovarForm(prev => ({ ...prev, remuneracion: e.target.value }))}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Cliente</Label>
                <Select value={renovarForm.cliente_id} onValueChange={onClienteChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccione cliente" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Sede</Label>
                <Select
                  value={renovarForm.sede_id}
                  onValueChange={(v) => setRenovarForm(prev => ({ ...prev, sede_id: v }))}
                  disabled={!renovarForm.cliente_id}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccione sede" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {sedesFiltradas.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Cargo</Label>
                <Select
                  value={renovarForm.cargo_id}
                  onValueChange={(v) => setRenovarForm(prev => ({ ...prev, cargo_id: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Mantener cargo actual" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Plantilla de Contrato</Label>
                <Select
                  value={renovarForm.plantilla_id}
                  onValueChange={(v) => setRenovarForm(prev => ({ ...prev, plantilla_id: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccione plantilla" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px]">
                    {plantillas.filter((p) => p.archivo_base_url).map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.nombre} {p.es_predeterminada && '(Predeterminada)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generar_doc_renovar"
                  checked={renovarForm.generar_documento}
                  onCheckedChange={(checked) =>
                    setRenovarForm(prev => ({ ...prev, generar_documento: checked as boolean }))
                  }
                  disabled={!renovarForm.plantilla_id}
                />
                <label htmlFor="generar_doc_renovar" className="text-xs sm:text-sm cursor-pointer">
                  Generar documento PDF al renovar
                </label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 pt-4 border-t flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={onRenovar} disabled={renovando} className="w-full sm:w-auto">
            {renovando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Renovar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
