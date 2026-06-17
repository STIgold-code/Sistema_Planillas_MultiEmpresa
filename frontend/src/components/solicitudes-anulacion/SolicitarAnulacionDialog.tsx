'use client';

import { useState } from 'react';
import { Loader2, X, Paperclip, AlertTriangle } from 'lucide-react';
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
import { api } from '@/lib/api';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;
const MIN_MOTIVO_LENGTH = 10;

interface Props {
  open: boolean;
  contrato: {
    id: number;
    tipo_contrato: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    estado: string;
    numero_renovacion?: number | null;
  } | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SolicitarAnulacionDialog({ open, contrato, onOpenChange, onSuccess }: Props) {
  const [motivo, setMotivo] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setMotivo('');
    setArchivos([]);
  }

  function handleClose() {
    onOpenChange(false);
    resetForm();
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) rejected.push(`${f.name} (mayor a 50 MB)`);
      else accepted.push(f);
    }

    const merged = [...archivos, ...accepted].slice(0, MAX_FILES);
    setArchivos(merged);

    if (rejected.length > 0) {
      alert(`Archivos rechazados:\n${rejected.join('\n')}`);
    }
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setArchivos(archivos.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!contrato) return;
    if (motivo.trim().length < MIN_MOTIVO_LENGTH) {
      toast.error(`El motivo debe tener al menos ${MIN_MOTIVO_LENGTH} caracteres`);
      return;
    }
    if (archivos.length === 0) {
      toast.error('Adjunte al menos un documento de respaldo');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('contrato_id', String(contrato.id));
      formData.append('motivo', motivo.trim());
      for (const f of archivos) formData.append('files', f);

      await api.upload('/solicitudes-anulacion', formData);
      toast.success('Solicitud de anulación creada, pendiente de aprobación del admin');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear la solicitud de anulación');
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = motivo.trim().length >= MIN_MOTIVO_LENGTH && archivos.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Anulación de Contrato</DialogTitle>
          <DialogDescription>
            Esta solicitud quedará en estado <strong>PENDIENTE</strong> hasta que el admin la apruebe.
          </DialogDescription>
        </DialogHeader>

        {contrato && (
          <div className="rounded border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Contrato #{contrato.id}</span>
              <span className="text-muted-foreground">— {contrato.tipo_contrato}</span>
              {contrato.numero_renovacion && contrato.numero_renovacion > 1 && (
                <span className="text-xs text-muted-foreground">
                  (renovación #{contrato.numero_renovacion})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Estado actual: <strong>{contrato.estado}</strong>
            </div>
          </div>
        )}

        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-amber-800">
            Anular un contrato lo marca como histórico tachado. Si estaba <strong>CESADO</strong>,
            se revierte el cese (empleado y vínculo vuelven a ACTIVO). No usar para ceses normales.
          </p>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Motivo de la anulación <span className="text-red-600">*</span>
            </Label>
            <Textarea
              placeholder="Describí por qué se anula este contrato (ej: el empleado no se presentó tras la renovación)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {MIN_MOTIVO_LENGTH} caracteres. {motivo.length}/2000.
            </p>
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
              disabled={archivos.length >= MAX_FILES}
            />
            <p className="text-xs text-muted-foreground">
              Carta del empleado, captura de chat, acta, etc. Máx 50 MB c/u, hasta {MAX_FILES} archivos.
            </p>
            {archivos.length > 0 && (
              <ul className="space-y-1 mt-2">
                {archivos.map((f, i) => (
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
            {archivos.length === 0 && (
              <p className="text-xs text-red-600">Debes adjuntar al menos un documento.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
