'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, Download } from 'lucide-react';
import { exportToPdf, generatePdfFilename } from '@/lib/pdf-export';
import { toast } from 'sonner';
import type { PlantillaDocumento, DocumentoGenerado } from './documentos-tab.types';

const categoriaLabels: Record<string, string> = {
  INGRESO: 'Ingreso',
  LABORAL: 'Laboral',
  SALIDA: 'Salida',
};

// ─── Generate Dialog ──────────────────────────────────────────────────────────

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantillasDisponibles: PlantillaDocumento[];
  selectedPlantilla: string;
  onSelectPlantilla: (value: string) => void;
  generating: boolean;
  onGenerate: () => void;
}

export function GenerateDialog({
  open,
  onOpenChange,
  plantillasDisponibles,
  selectedPlantilla,
  onSelectPlantilla,
  generating,
  onGenerate,
}: GenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Documento</DialogTitle>
          <DialogDescription>
            Seleccione una plantilla para generar el documento con los datos del empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedPlantilla} onValueChange={onSelectPlantilla}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione plantilla" />
            </SelectTrigger>
            <SelectContent>
              {plantillasDisponibles.map((plantilla) => (
                <SelectItem key={plantilla.id} value={plantilla.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{plantilla.nombre}</span>
                    <Badge variant="outline" className="text-xs">
                      {categoriaLabels[plantilla.categoria]}
                    </Badge>
                    {plantilla.es_obligatorio && (
                      <Badge variant="secondary" className="text-xs">
                        Obligatorio
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {plantillasDisponibles.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Todos los documentos ya han sido generados.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onGenerate} disabled={generating || !selectedPlantilla}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Generar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dialog ───────────────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewTitle: string;
  previewContent: string;
  exportingPdf: boolean;
  setExportingPdf: (v: boolean) => void;
}

export function PreviewDialog({
  open,
  onOpenChange,
  previewTitle,
  previewContent,
  exportingPdf,
  setExportingPdf,
}: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{previewTitle}</DialogTitle>
        </DialogHeader>
        <div className="bg-white rounded-lg border overflow-hidden">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; } * { box-sizing: border-box; }</style></head><body>${previewContent}</body></html>`}
            className="w-full h-[600px] border-0"
            title="Vista previa del documento"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button
            onClick={async () => {
              setExportingPdf(true);
              try {
                await exportToPdf(previewContent, {
                  filename: generatePdfFilename(previewTitle),
                  margin: 10,
                  pageSize: 'a4',
                });
                toast.success('PDF exportado correctamente');
              } catch (error) {
                toast.error('Error al exportar PDF');
                console.error(error);
              } finally {
                setExportingPdf(false);
              }
            }}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exportando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Exportar PDF</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Generado AlertDialog ──────────────────────────────────────────────

interface DeleteGeneradoDialogProps {
  documentoToDelete: DocumentoGenerado | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteGeneradoDialog({
  documentoToDelete,
  onOpenChange,
  onConfirm,
}: DeleteGeneradoDialogProps) {
  return (
    <AlertDialog open={!!documentoToDelete} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Documento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta accion eliminara permanentemente el documento &quot;{documentoToDelete?.plantilla_documento.nombre}&quot;.
            Esta accion no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
