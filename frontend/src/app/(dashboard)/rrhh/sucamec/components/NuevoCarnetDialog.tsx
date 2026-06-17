'use client';

import { CategoriaSucamec } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, X, FileText } from 'lucide-react';
import { CarnetForm, EmpleadoBasico, CATEGORIAS_SUCAMEC } from '../hooks/useSucamec';

interface NuevoCarnetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CarnetForm;
  setForm: React.Dispatch<React.SetStateAction<CarnetForm>>;
  saving: boolean;
  carnetFile: File | null;
  setCarnetFile: (file: File | null) => void;
  empleadoSearch: string;
  setEmpleadoSearch: (v: string) => void;
  empleados: EmpleadoBasico[];
  loadingEmpleados: boolean;
  showEmpleadoResults: boolean;
  setShowEmpleadoResults: (v: boolean) => void;
  selectedEmpleado: EmpleadoBasico | null;
  onSelectEmpleado: (empleado: EmpleadoBasico) => void;
  onClearEmpleado: () => void;
  onSearchEmpleados: (query: string) => void;
  getEmpleadoLabel: (empleado: EmpleadoBasico) => string;
  onCrear: () => void;
}

export function NuevoCarnetDialog({
  open,
  onOpenChange,
  form,
  setForm,
  saving,
  carnetFile,
  setCarnetFile,
  empleadoSearch,
  setEmpleadoSearch,
  empleados,
  loadingEmpleados,
  showEmpleadoResults,
  setShowEmpleadoResults,
  selectedEmpleado,
  onSelectEmpleado,
  onClearEmpleado,
  onSearchEmpleados,
  getEmpleadoLabel,
  onCrear,
}: NuevoCarnetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Nuevo Carnet SUCAMEC</DialogTitle>
          <DialogDescription>Registre un nuevo carnet SUCAMEC para un empleado</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Buscador de empleados */}
          <div className="space-y-2">
            <Label>Empleado *</Label>
            {selectedEmpleado ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                <span className="flex-1 text-sm">{getEmpleadoLabel(selectedEmpleado)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onClearEmpleado}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o DNI..."
                  value={empleadoSearch}
                  onChange={(e) => {
                    setEmpleadoSearch(e.target.value);
                    onSearchEmpleados(e.target.value);
                    setShowEmpleadoResults(true);
                  }}
                  onFocus={() => setShowEmpleadoResults(true)}
                  className="pl-10"
                />
                {showEmpleadoResults && (empleadoSearch.length >= 2 || empleados.length > 0) && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loadingEmpleados ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : empleados.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        {empleadoSearch.length < 2
                          ? 'Escriba al menos 2 caracteres'
                          : 'No se encontraron empleados'}
                      </div>
                    ) : (
                      empleados.map((empleado) => (
                        <button
                          key={empleado.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          onClick={() => onSelectEmpleado(empleado)}
                        >
                          {getEmpleadoLabel(empleado)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numero de Carnet *</Label>
              <Input
                value={form.numero_carnet}
                onChange={e => setForm(prev => ({ ...prev, numero_carnet: e.target.value.toUpperCase() }))}
                placeholder="Ej: SUC-123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.categoria}
                onValueChange={value => setForm(prev => ({ ...prev, categoria: value as CategoriaSucamec }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_SUCAMEC.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Emision *</Label>
              <Input
                type="date"
                value={form.fecha_emision}
                onChange={e => setForm(prev => ({ ...prev, fecha_emision: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Vencimiento *</Label>
              <Input
                type="date"
                value={form.fecha_vencimiento}
                onChange={e => setForm(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Documento del Carnet (opcional)</Label>
            {!carnetFile ? (
              <>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setCarnetFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  PDF o imagen del carnet SUCAMEC. Se guardara tambien en el expediente del empleado.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                {carnetFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(carnetFile)}
                    alt="Vista previa"
                    className="h-16 w-16 object-cover rounded border"
                  />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center bg-red-50 rounded border">
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{carnetFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(carnetFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCarnetFile(null)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onCrear} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
