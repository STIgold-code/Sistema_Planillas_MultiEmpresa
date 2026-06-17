'use client';

import { Loader2, X, Paperclip } from 'lucide-react';
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
import { AlertaUniformesPendientes } from '@/components/inventario/alerta-uniformes-pendientes';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;

export interface CeseForm {
  tipo_cese_id: string;
  motivo: string;
  fecha_efectiva: string;
}

export interface ContratoCeseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ceseForm: CeseForm;
  setCeseForm: (form: CeseForm) => void;
  ceseFiles: File[];
  setCeseFiles: (files: File[]) => void;
  tiposCese: { id: number; nombre: string }[];
  saving: boolean;
  handleSolicitarCese: () => void;
  empleadoId?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContratoCeseDialog({
  open,
  onOpenChange,
  ceseForm,
  setCeseForm,
  ceseFiles,
  setCeseFiles,
  tiposCese,
  saving,
  handleSolicitarCese,
  empleadoId,
}: ContratoCeseDialogProps) {
  function handleClose() {
    onOpenChange(false);
    setCeseForm({ tipo_cese_id: '', motivo: '', fecha_efectiva: '' });
    setCeseFiles([]);
  }

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
    setCeseFiles(merged);

    if (rejected.length > 0) {
      alert(`Archivos rechazados:\n${rejected.join('\n')}`);
    }
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setCeseFiles(ceseFiles.filter((_, i) => i !== index));
  }

  const canSubmit =
    !!ceseForm.tipo_cese_id &&
    !!ceseForm.fecha_efectiva &&
    ceseFiles.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Cese</DialogTitle>
          <DialogDescription>
            Se creara una solicitud de cese que debe ser aprobada por un administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {empleadoId && <AlertaUniformesPendientes empleadoId={empleadoId} />}
          <div className="space-y-2">
            <Label>Tipo de Cese *</Label>
            <Select value={ceseForm.tipo_cese_id} onValueChange={(v) => setCeseForm({ ...ceseForm, tipo_cese_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo de cese" />
              </SelectTrigger>
              <SelectContent>
                {tiposCese.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)}>
                    {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Detalle o descripcion del motivo de cese..."
              value={ceseForm.motivo}
              onChange={(e) => setCeseForm({ ...ceseForm, motivo: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Documentos de respaldo <span className="text-red-600">*</span>
            </Label>
            <Input
              type="file"
              multiple
              onChange={handleAddFiles}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              disabled={ceseFiles.length >= MAX_FILES}
            />
            <p className="text-xs text-muted-foreground">
              Carta de renuncia, foto, acta, etc. PDF, Word, Excel o imagen. Máximo 50 MB por archivo, hasta {MAX_FILES} archivos.
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
            <Label>Fecha Efectiva *</Label>
            <Input
              type="date"
              min="2020-01-01"
              max="2100-12-31"
              value={ceseForm.fecha_efectiva}
              onChange={(e) => setCeseForm({ ...ceseForm, fecha_efectiva: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSolicitarCese}
            disabled={saving || !canSubmit}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
