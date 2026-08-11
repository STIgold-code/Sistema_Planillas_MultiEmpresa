'use client';

import { useEffect, useState } from 'react';
import { Loader2, X, Paperclip, Info } from 'lucide-react';
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
import { getApiErrorMessage } from '@/lib/errors';
import { validarAnioFechaContrato } from '@/lib/validar-fecha-contrato';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;
const MIN_MOTIVO_LENGTH = 10;

/** Datos del contrato que el diálogo necesita para precargar el formulario. */
export interface ContratoACorregir {
  id: number;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  estado: string;
  numero_renovacion?: number | null;
}

interface Props {
  open: boolean;
  contrato: ContratoACorregir | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function aInputDate(valor?: string | null): string {
  if (!valor) return '';
  return valor.split('T')[0];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SolicitarCorreccionFechasDialog({
  open,
  contrato,
  onOpenChange,
  onSuccess,
}: Props) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const esIndefinido = contrato?.tipo_contrato === 'INDEFINIDO';

  // Precargar con las fechas vigentes cada vez que se abre o cambia el contrato.
  useEffect(() => {
    if (!open) return;
    setFechaInicio(aInputDate(contrato?.fecha_inicio));
    setFechaFin(aInputDate(contrato?.fecha_fin));
    setMotivo('');
    setArchivos([]);
  }, [open, contrato]);

  function handleClose() {
    onOpenChange(false);
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(e.target.files ?? []);
    const aceptados: File[] = [];
    const rechazados: string[] = [];

    for (const f of nuevos) {
      if (f.size > MAX_FILE_SIZE) rechazados.push(`${f.name} (mayor a 50 MB)`);
      else aceptados.push(f);
    }

    setArchivos([...archivos, ...aceptados].slice(0, MAX_FILES));

    if (rechazados.length > 0) {
      toast.error(`Archivos rechazados: ${rechazados.join(', ')}`);
    }
    e.target.value = '';
  }

  function handleRemoveFile(indice: number) {
    setArchivos(archivos.filter((_, i) => i !== indice));
  }

  const sinCambios =
    !!contrato &&
    fechaInicio === aInputDate(contrato.fecha_inicio) &&
    fechaFin === aInputDate(contrato.fecha_fin);

  async function handleSubmit() {
    if (!contrato) return;

    if (!fechaInicio) {
      toast.error('La fecha de inicio es obligatoria');
      return;
    }
    if (!esIndefinido && !fechaFin) {
      toast.error('La fecha de fin es obligatoria en contratos de plazo fijo');
      return;
    }
    if (fechaFin && fechaFin < fechaInicio) {
      toast.error('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }
    const errorAnio =
      validarAnioFechaContrato(fechaInicio, 'La fecha de inicio') ??
      validarAnioFechaContrato(fechaFin || undefined, 'La fecha de fin');
    if (errorAnio) {
      toast.error(errorAnio);
      return;
    }
    if (sinCambios) {
      toast.error('Las fechas propuestas son iguales a las actuales');
      return;
    }
    if (motivo.trim().length < MIN_MOTIVO_LENGTH) {
      toast.error(
        `El motivo debe tener al menos ${MIN_MOTIVO_LENGTH} caracteres`,
      );
      return;
    }
    if (archivos.length === 0) {
      toast.error('Adjunta al menos un documento que sustente la corrección');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('contrato_id', String(contrato.id));
      formData.append('motivo', motivo.trim());
      formData.append('fecha_inicio', fechaInicio);
      if (fechaFin) formData.append('fecha_fin', fechaFin);
      for (const f of archivos) formData.append('files', f);

      await api.upload('/solicitudes-correccion-fechas', formData);
      toast.success(
        'Solicitud enviada. Un administrador debe aprobarla para que las fechas cambien.',
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, 'Error al enviar la solicitud de corrección'),
      );
    } finally {
      setSaving(false);
    }
  }

  const puedeEnviar =
    !!fechaInicio &&
    (esIndefinido || !!fechaFin) &&
    !sinCambios &&
    motivo.trim().length >= MIN_MOTIVO_LENGTH &&
    archivos.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Corrección de Fechas</DialogTitle>
          <DialogDescription>
            La solicitud queda en estado <strong>PENDIENTE</strong>. Las fechas
            del contrato no cambian hasta que un administrador la apruebe.
          </DialogDescription>
        </DialogHeader>

        {contrato && (
          <div className="rounded border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Contrato #{contrato.id}</span>
              <span className="text-muted-foreground">
                — {contrato.tipo_contrato}
              </span>
              {contrato.numero_renovacion && contrato.numero_renovacion > 1 && (
                <span className="text-xs text-muted-foreground">
                  (renovación #{contrato.numero_renovacion})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Vigencia actual: {aInputDate(contrato.fecha_inicio) || '—'} →{' '}
              {aInputDate(contrato.fecha_fin) || 'Indefinido'}
            </div>
          </div>
        )}

        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
          <p className="text-blue-800">
            Los campos vienen precargados con las fechas vigentes. Ajusta solo
            las que necesitas corregir.
          </p>
        </div>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="correccion-fecha-inicio">
                Fecha de inicio <span className="text-red-600">*</span>
              </Label>
              <Input
                id="correccion-fecha-inicio"
                type="date"
                min="2020-01-01"
                max="2100-12-31"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correccion-fecha-fin">
                Fecha de fin{' '}
                {!esIndefinido && <span className="text-red-600">*</span>}
              </Label>
              <Input
                id="correccion-fecha-fin"
                type="date"
                min="2020-01-01"
                max="2100-12-31"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correccion-motivo">
              Motivo de la corrección <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="correccion-motivo"
              placeholder="Explica por qué solicitas el cambio (ej: la fecha de fin se registró con un error de tipeo)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {MIN_MOTIVO_LENGTH} caracteres. {motivo.length}/2000.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correccion-sustento">
              Documentos de sustento <span className="text-red-600">*</span>
            </Label>
            <Input
              id="correccion-sustento"
              type="file"
              multiple
              onChange={handleAddFiles}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              disabled={archivos.length >= MAX_FILES}
            />
            <p className="text-xs text-muted-foreground">
              Adenda, contrato firmado o acta. Máx 50 MB c/u, hasta {MAX_FILES}{' '}
              archivos.
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
                      <span className="shrink-0 text-muted-foreground">
                        ({formatFileSize(f.size)})
                      </span>
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
              <p className="text-xs text-red-600">
                Debes adjuntar al menos un documento.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !puedeEnviar}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
