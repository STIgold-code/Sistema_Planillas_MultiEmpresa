'use client';

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
import { Loader2 } from 'lucide-react';
import { PlanillaDetalle } from '@/types';
import { EditForm } from '../types';

interface EditDetalleDialogProps {
  editingDetalle: PlanillaDetalle | null;
  editForm: EditForm;
  saving: boolean;
  getNombreCompleto: (empleado: PlanillaDetalle['empleado']) => string;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: EditForm) => void;
}

export function EditDetalleDialog({
  editingDetalle,
  editForm,
  saving,
  getNombreCompleto,
  onClose,
  onSave,
  onChange,
}: EditDetalleDialogProps) {
  const handleField = (field: keyof EditForm, value: string) => {
    onChange({ ...editForm, [field]: parseFloat(value) || 0 });
  };

  return (
    <Dialog open={!!editingDetalle} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Editar Conceptos Variables</DialogTitle>
          <DialogDescription className="text-sm">
            {editingDetalle && getNombreCompleto(editingDetalle.empleado)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* HORAS EXTRAS */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-1">Horas Extras</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">H.E. 25%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.horas_extras_25}
                  onChange={(e) => handleField('horas_extras_25', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">H.E. 35%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.horas_extras_35}
                  onChange={(e) => handleField('horas_extras_35', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* INGRESOS */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-green-700 border-b border-green-200 pb-1">Ingresos Manuales</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pasaje Especial</Label>
                <Input type="number" step="0.01" value={editForm.pasaje_especial} onChange={(e) => handleField('pasaje_especial', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bonificaciones</Label>
                <Input type="number" step="0.01" value={editForm.bonificaciones} onChange={(e) => handleField('bonificaciones', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Otros Ingresos</Label>
                <Input type="number" step="0.01" value={editForm.otros_ingresos} onChange={(e) => handleField('otros_ingresos', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comp. Vacacional</Label>
                <Input type="number" step="0.01" value={editForm.compensacion_vacacional} onChange={(e) => handleField('compensacion_vacacional', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pegada/Reenganche</Label>
                <Input type="number" step="0.01" value={editForm.pegada_reenganche} onChange={(e) => handleField('pegada_reenganche', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bono Referido</Label>
                <Input type="number" step="0.01" value={editForm.bono_referido} onChange={(e) => handleField('bono_referido', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reintegro D.Trab.</Label>
                <Input type="number" step="0.01" value={editForm.reintegro_dias_trab} onChange={(e) => handleField('reintegro_dias_trab', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reintegro Inafecto</Label>
                <Input type="number" step="0.01" value={editForm.reintegro_inafecto} onChange={(e) => handleField('reintegro_inafecto', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ingreso x Sobregiro</Label>
                <Input type="number" step="0.01" value={editForm.ingreso_sobregiro} onChange={(e) => handleField('ingreso_sobregiro', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Venta Vacaciones</Label>
                <Input type="number" step="0.01" value={editForm.venta_vacaciones} onChange={(e) => handleField('venta_vacaciones', e.target.value)} />
              </div>
            </div>
          </div>

          {/* DESCUENTOS */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-red-700 border-b border-red-200 pb-1">Descuentos Manuales</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Adelanto Quincena</Label>
                <Input type="number" step="0.01" value={editForm.adelanto_quincena} onChange={(e) => handleField('adelanto_quincena', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adelanto Vacacional</Label>
                <Input type="number" step="0.01" value={editForm.adelanto_vacacional} onChange={(e) => handleField('adelanto_vacacional', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Otros Adelantos</Label>
                <Input type="number" step="0.01" value={editForm.otros_adelantos} onChange={(e) => handleField('otros_adelantos', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adelanto CTS</Label>
                <Input type="number" step="0.01" value={editForm.adelanto_cts} onChange={(e) => handleField('adelanto_cts', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adelanto Gratif.</Label>
                <Input type="number" step="0.01" value={editForm.adelanto_gratificacion} onChange={(e) => handleField('adelanto_gratificacion', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Otros Descuentos</Label>
                <Input type="number" step="0.01" value={editForm.otros_descuentos} onChange={(e) => handleField('otros_descuentos', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dcts. Sobregiro</Label>
                <Input type="number" step="0.01" value={editForm.descuento_sobregiro} onChange={(e) => handleField('descuento_sobregiro', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dcts. Reintegro</Label>
                <Input type="number" step="0.01" value={editForm.descuento_reintegro} onChange={(e) => handleField('descuento_reintegro', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prestamo</Label>
                <Input type="number" step="0.01" value={editForm.prestamo} onChange={(e) => handleField('prestamo', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Retencion Judicial</Label>
                <Input type="number" step="0.01" value={editForm.retencion_judicial} onChange={(e) => handleField('retencion_judicial', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Renta 5ta Cat.</Label>
                <Input type="number" step="0.01" value={editForm.renta_5ta} onChange={(e) => handleField('renta_5ta', e.target.value)} />
              </div>
            </div>
          </div>

          {/* OBSERVACIONES */}
          <div className="space-y-2">
            <Label className="text-xs">Observaciones</Label>
            <Input
              value={editForm.observaciones}
              onChange={(e) => onChange({ ...editForm, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
