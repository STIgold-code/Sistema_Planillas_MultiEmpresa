'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, XCircle, X, Paperclip } from 'lucide-react';
import { AlertaUniformesPendientes } from '@/components/inventario/alerta-uniformes-pendientes';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Aprobar cese ─────────────────────────────────────────────────────────────

interface AprobarCeseProps {
  open: boolean;
  procesando: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DashboardAprobarCeseDialog({ open, procesando, onOpenChange, onConfirm }: AprobarCeseProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprobar Solicitud de Cese</AlertDialogTitle>
          <AlertDialogDescription>
            Esta accion terminara el contrato del empleado y lo pasara a estado CESADO. Esta accion no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={procesando} className="bg-green-600 hover:bg-green-700">
            {procesando ? 'Procesando...' : 'Aprobar Cese'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Rechazar cese ────────────────────────────────────────────────────────────

interface RechazarCeseProps {
  open: boolean;
  procesando: boolean;
  observaciones: string;
  onObservacionesChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DashboardRechazarCeseDialog({
  open,
  procesando,
  observaciones,
  onObservacionesChange,
  onOpenChange,
  onConfirm,
  onCancel,
}: RechazarCeseProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) onCancel(); else onOpenChange(true); }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar Solicitud de Cese</DialogTitle>
          <DialogDescription>
            Indique el motivo del rechazo (opcional). El empleado continuara activo.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Observaciones del rechazo..."
          value={observaciones}
          onChange={(e) => onObservacionesChange(e.target.value)}
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={procesando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={procesando}>
            {procesando ? 'Procesando...' : 'Rechazar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Solicitar cese ───────────────────────────────────────────────────────────

interface SolicitarCeseProps {
  open: boolean;
  empleadoACesar: { id: number; nombreCompleto: string } | null;
  ceseForm: { tipo_cese_id: string; motivo: string; fecha_efectiva: string };
  ceseFiles: File[];
  tiposCese: { id: number; nombre: string }[];
  solicitando: boolean;
  onCeseFormChange: (form: { tipo_cese_id: string; motivo: string; fecha_efectiva: string }) => void;
  onCeseFilesChange: (files: File[]) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DashboardSolicitarCeseDialog({
  open,
  empleadoACesar,
  ceseForm,
  ceseFiles,
  tiposCese,
  solicitando,
  onCeseFormChange,
  onCeseFilesChange,
  onOpenChange,
  onConfirm,
  onCancel,
}: SolicitarCeseProps) {
  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) {
        rejected.push(`${f.name} (mayor a 50 MB)`);
      } else {
        accepted.push(f);
      }
    }

    const merged = [...ceseFiles, ...accepted].slice(0, MAX_FILES);
    onCeseFilesChange(merged);

    if (rejected.length > 0) {
      alert(`Archivos rechazados:\n${rejected.join('\n')}`);
    }
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    onCeseFilesChange(ceseFiles.filter((_, i) => i !== index));
  }

  const canSubmit =
    !!ceseForm.tipo_cese_id &&
    !!ceseForm.fecha_efectiva &&
    ceseFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); else onOpenChange(true); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Cese</DialogTitle>
          {empleadoACesar && (
            <DialogDescription>{empleadoACesar.nombreCompleto}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 py-4">
          {empleadoACesar && (
            <AlertaUniformesPendientes empleadoId={empleadoACesar.id} />
          )}
          <div className="space-y-2">
            <Label className="text-sm">Tipo de Cese *</Label>
            <Select
              value={ceseForm.tipo_cese_id}
              onValueChange={(v) => onCeseFormChange({ ...ceseForm, tipo_cese_id: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Seleccione tipo de cese" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px]">
                {tiposCese.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Motivo (opcional)</Label>
            <Textarea
              placeholder="Detalle o descripcion del motivo de cese..."
              value={ceseForm.motivo}
              onChange={(e) => onCeseFormChange({ ...ceseForm, motivo: e.target.value })}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              Documentos de respaldo <span className="text-red-600">*</span>
            </Label>
            <Input
              type="file"
              multiple
              onChange={handleAddFiles}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              disabled={ceseFiles.length >= MAX_FILES}
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Carta de renuncia, foto, acta, etc. Máx 50 MB por archivo, hasta {MAX_FILES} archivos.
            </p>
            {ceseFiles.length > 0 && (
              <ul className="space-y-1 mt-2">
                {ceseFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0 text-muted-foreground">({formatFileSize(f.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-100 hover:text-red-700"
                      aria-label={`Quitar ${f.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {ceseFiles.length === 0 && (
              <p className="text-xs text-red-600">Debes adjuntar al menos un documento.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Fecha Efectiva *</Label>
            <Input
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={ceseForm.fecha_efectiva}
              onChange={(e) => onCeseFormChange({ ...ceseForm, fecha_efectiva: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={solicitando || !canSubmit}
            className="w-full sm:w-auto"
          >
            {solicitando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <XCircle className="mr-2 h-4 w-4" />
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
