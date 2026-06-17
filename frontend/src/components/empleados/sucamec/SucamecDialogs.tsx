'use client';

import { CarnetSucamec, EstadoCarnetSucamec } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';
import { CATEGORIAS_SUCAMEC, CarnetForm, DocumentoSinVincular } from '../hooks/useEmpleadoSucamec';
import { CategoriaSucamec } from '@/types';

const estadoBadgeVariant: Record<EstadoCarnetSucamec, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  VIGENTE: 'default',
  VENCIDO: 'destructive',
  SUSPENDIDO: 'secondary',
  ANULADO: 'outline',
};

interface CarnetFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  form: CarnetForm;
  setForm: React.Dispatch<React.SetStateAction<CarnetForm>>;
  saving: boolean;
  onSubmit: () => void;
  documentosSinVincular: DocumentoSinVincular[];
  // Only for Nuevo
  carnetFile?: File | null;
  setCarnetFile?: (f: File | null) => void;
  // Labels
  submitLabel: string;
  numeroLabel?: string;
}

export function CarnetFormDialog({
  open, onOpenChange, title, description, form, setForm, saving, onSubmit,
  documentosSinVincular, carnetFile, setCarnetFile, submitLabel, numeroLabel = 'Numero de Carnet *',
}: CarnetFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{numeroLabel}</Label>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
          {setCarnetFile && (
            <div className="space-y-2">
              <Label>Documento del Carnet (opcional)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setCarnetFile(file);
                  if (file) setForm(prev => ({ ...prev, documento_id: undefined }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                PDF o imagen del carnet SUCAMEC. Se guardara tambien en el expediente del empleado.
              </p>
            </div>
          )}
          {documentosSinVincular.length > 0 && !carnetFile && (
            <div className="space-y-2">
              <Label>O vincular documento existente</Label>
              <Select
                value={form.documento_id?.toString() || ''}
                onValueChange={value => setForm(prev => ({ ...prev, documento_id: value ? parseInt(value) : undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar documento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin documento</SelectItem>
                  {documentosSinVincular.map(doc => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {doc.archivo_nombre} ({formatDateSafe(doc.created_at)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo se muestran documentos SUCAMEC sin vincular a otro carnet
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface VincularDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCarnet: CarnetSucamec | null;
  documentosSinVincular: DocumentoSinVincular[];
  selectedDocumentoId: number | undefined;
  setSelectedDocumentoId: (id: number | undefined) => void;
  saving: boolean;
  onSubmit: () => void;
}

export function VincularDocumentoDialog({
  open, onOpenChange, selectedCarnet, documentosSinVincular, selectedDocumentoId,
  setSelectedDocumentoId, saving, onSubmit,
}: VincularDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Documento</DialogTitle>
          <DialogDescription>
            Seleccione un documento SUCAMEC para vincular al carnet {selectedCarnet?.numero_carnet}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {documentosSinVincular.length > 0 ? (
            <div className="space-y-2">
              <Label>Documento SUCAMEC</Label>
              <Select
                value={selectedDocumentoId?.toString() || ''}
                onValueChange={value => setSelectedDocumentoId(value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar documento..." />
                </SelectTrigger>
                <SelectContent>
                  {documentosSinVincular.map(doc => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {doc.archivo_nombre} ({formatDateSafe(doc.created_at)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay documentos SUCAMEC disponibles para vincular.
              Suba un documento desde la pestaña Documentos.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || !selectedDocumentoId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DetalleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  carnet: CarnetSucamec | null;
  getCategoriaLabel: (cat: CategoriaSucamec) => string;
}

export function DetalleCarnetDialog({ open, onOpenChange, carnet, getCategoriaLabel }: DetalleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del Carnet</DialogTitle>
        </DialogHeader>
        {carnet && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Numero de Carnet</p>
                <p className="font-mono font-medium">{carnet.numero_carnet}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge variant={estadoBadgeVariant[carnet.estado]}>{carnet.estado}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="font-medium">{getCategoriaLabel(carnet.categoria)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Emision</p>
                <p className="font-medium">{formatDateSafe(carnet.fecha_emision)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
                <p className="font-medium">{formatDateSafe(carnet.fecha_vencimiento)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registrado</p>
                <p className="font-medium">{formatDateSafe(carnet.created_at)}</p>
              </div>
            </div>
            {carnet.observaciones && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded">{carnet.observaciones}</p>
              </div>
            )}
            {carnet.documento && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Documento Vinculado</p>
                <a
                  href={carnet.documento.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted rounded text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{carnet.documento.archivo_nombre}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MotivoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  motivoLabel: string;
  motivoPlaceholder: string;
  motivo: string;
  setMotivo: (v: string) => void;
  saving: boolean;
  onConfirm: () => void;
  confirmLabel: string;
  confirmClassName: string;
}

export function MotivoAlertDialog({
  open, onOpenChange, title, description, motivoLabel, motivoPlaceholder,
  motivo, setMotivo, saving, onConfirm, confirmLabel, confirmClassName,
}: MotivoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label>{motivoLabel}</Label>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder={motivoPlaceholder}
            rows={3}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={saving || !motivo}
            className={confirmClassName}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
