'use client';

import { PostulanteDocumento, PostulanteDocumentoHistorial } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Loader2, Eye } from 'lucide-react';

// ─── Reject Dialog ────────────────────────────────────────────────────────────

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motivoRechazo: string;
  setMotivoRechazo: (v: string) => void;
  actionLoading: boolean;
  onRechazar: () => void;
}

export function RejectDialog({
  open,
  onOpenChange,
  motivoRechazo,
  setMotivoRechazo,
  actionLoading,
  onRechazar,
}: RejectDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setMotivoRechazo('');
      }}
    >
      <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg md:text-xl">Rechazar Postulante</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Indica el motivo del rechazo. El postulante podra volver a En Proceso posteriormente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Motivo del rechazo..."
          value={motivoRechazo}
          onChange={(e) => setMotivoRechazo(e.target.value)}
          rows={3}
        />
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRechazar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={actionLoading}
          >
            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rechazar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete Eval Dialog ───────────────────────────────────────────────────────

interface DeleteEvalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  onEliminar: () => void;
}

export function DeleteEvalDialog({ open, onOpenChange, actionLoading, onEliminar }: DeleteEvalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg md:text-xl">Eliminar Evaluacion</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Esta accion no se puede deshacer. ¿Desea eliminar esta evaluacion?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onEliminar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={actionLoading}
          >
            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete Doc Dialog ────────────────────────────────────────────────────────

interface DeleteDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteDocTarget: PostulanteDocumento | null;
  deleteDocMotivo: string;
  setDeleteDocMotivo: (v: string) => void;
  deletingDocId: number | null;
  onConfirm: () => void;
}

export function DeleteDocDialog({
  open,
  onOpenChange,
  deleteDocTarget,
  deleteDocMotivo,
  setDeleteDocMotivo,
  deletingDocId,
  onConfirm,
}: DeleteDocDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDeleteDocMotivo('');
      }}
    >
      <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Documento</AlertDialogTitle>
          <AlertDialogDescription>
            Se marcara como eliminado el documento &quot;
            {deleteDocTarget?.tipo_documento_empleado?.nombre || deleteDocTarget?.descripcion || 'seleccionado'}
            &quot; y todas sus versiones. El archivo se conserva para trazabilidad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="motivo-eliminacion-doc">Motivo (opcional)</Label>
          <Input
            id="motivo-eliminacion-doc"
            placeholder="Ej: Documento incorrecto..."
            value={deleteDocMotivo}
            onChange={(e) => setDeleteDocMotivo(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deletingDocId !== null}
          >
            {deletingDocId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Nueva Version Dialog ─────────────────────────────────────────────────────

interface NuevaVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nuevaVersionDoc: PostulanteDocumento | null;
  nuevaVersionFile: File | null;
  setNuevaVersionFile: (f: File | null) => void;
  nuevaVersionMotivo: string;
  setNuevaVersionMotivo: (v: string) => void;
  subiendoVersion: boolean;
  nuevaVersionFileRef: React.RefObject<HTMLInputElement | null>;
  onSubir: () => void;
}

export function NuevaVersionDialog({
  open,
  onOpenChange,
  nuevaVersionDoc,
  nuevaVersionFile,
  setNuevaVersionFile,
  nuevaVersionMotivo,
  setNuevaVersionMotivo,
  subiendoVersion,
  nuevaVersionFileRef,
  onSubir,
}: NuevaVersionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) { setNuevaVersionFile(null); setNuevaVersionMotivo(''); }
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Nueva Version de Documento</DialogTitle>
          <DialogDescription>
            Sube una nueva version de &quot;
            {nuevaVersionDoc?.tipo_documento_empleado?.nombre || nuevaVersionDoc?.descripcion || 'documento'}
            &quot;. La version anterior se conservara en el historial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nueva-version-file">Archivo</Label>
            <Input
              id="nueva-version-file"
              ref={nuevaVersionFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setNuevaVersionFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {nuevaVersionFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {nuevaVersionFile.name} ({(nuevaVersionFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="nueva-version-motivo">Motivo del cambio *</Label>
            <Input
              id="nueva-version-motivo"
              placeholder="Ej: Documento actualizado con firma..."
              value={nuevaVersionMotivo}
              onChange={(e) => setNuevaVersionMotivo(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubir}
            disabled={!nuevaVersionFile || !nuevaVersionMotivo.trim() || subiendoVersion}
          >
            {subiendoVersion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Subir Nueva Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Historial Dialog ─────────────────────────────────────────────────────────

interface HistorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historialDocNombre: string;
  historial: PostulanteDocumentoHistorial[];
  cargandoHistorial: boolean;
  onPreview: (url: string, nombre: string) => void;
}

export function HistorialDialog({
  open,
  onOpenChange,
  historialDocNombre,
  historial,
  cargandoHistorial,
  onPreview,
}: HistorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Versiones</DialogTitle>
          <DialogDescription>{historialDocNombre}</DialogDescription>
        </DialogHeader>
        {cargandoHistorial ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map((v) => (
              <div
                key={v.id}
                className={`border rounded-lg p-3 ${v.eliminado ? 'opacity-50 bg-muted/50' : v.es_version_vigente ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={v.es_version_vigente ? 'default' : v.eliminado ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {v.es_version_vigente ? 'Vigente' : v.eliminado ? 'Eliminado' : `v${v.version}`}
                    </Badge>
                    <span className="text-sm font-medium">Version {v.version}</span>
                  </div>
                  {!v.eliminado && v.archivo_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onPreview(v.archivo_url, v.archivo_nombre || historialDocNombre)}
                      title="Ver"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>
                    {v.archivo_nombre || 'Sin nombre'} -{' '}
                    {new Date(v.fecha_carga).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {v.subido_por && <p>Subido por: {v.subido_por.nombre_completo}</p>}
                  {v.motivo_nueva_version && <p>Motivo: {v.motivo_nueva_version}</p>}
                  {v.eliminado && v.eliminado_por && (
                    <p className="text-destructive">
                      Eliminado por: {v.eliminado_por.nombre_completo}
                      {v.motivo_eliminacion ? ` - ${v.motivo_eliminacion}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {historial.length === 0 && !cargandoHistorial && (
              <p className="text-center text-muted-foreground py-4">No hay historial disponible</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
