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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, Upload, FileCheck, FolderUp, RefreshCw } from 'lucide-react';
import type {
  TipoDocumentoEmpleado,
  DocumentoSubido,
  VersionHistorial,
  UploadData,
} from './documentos-tab.types';

// ─── Upload Dialog ────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadFile: File | null;
  uploadFileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadData: UploadData;
  setUploadData: (data: UploadData) => void;
  tiposDocumento: TipoDocumentoEmpleado[];
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  uploadFile,
  uploadFileInputRef,
  uploadData,
  setUploadData,
  tiposDocumento,
  uploading,
  onFileSelect,
  onUpload,
}: UploadDialogProps) {
  const selectedTipo = tiposDocumento.find(t => t.id.toString() === uploadData.tipo_documento_empleado_id);
  const tipoVigencia = selectedTipo?.tipo_vigencia || 'SIN_FECHAS';
  const showVencimiento = tipoVigencia === 'CON_VENCIMIENTO';

  const vigenciaConfig = {
    SIN_FECHAS: { text: 'No requiere fechas', color: 'text-muted-foreground' },
    SOLO_EMISION: { text: 'Solo requiere fecha de emisión', color: 'text-blue-600' },
    CON_VENCIMIENTO: { text: 'Requiere fecha de emisión y vencimiento', color: 'text-orange-600' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Sube un documento del empleado (PDF, Word, imagen).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              uploadFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => uploadFileInputRef.current?.click()}
          >
            {uploadFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileCheck className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <FolderUp className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG (max 10MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            ref={uploadFileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={onFileSelect}
          />

          {/* Tipo de documento */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de documento *</Label>
            <Select
              value={uploadData.tipo_documento_empleado_id}
              onValueChange={(value) =>
                setUploadData({
                  ...uploadData,
                  tipo_documento_empleado_id: value,
                  fecha_emision: '',
                  fecha_vencimiento: '',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{tipo.nombre}</span>
                      {tipo.es_obligatorio && (
                        <Badge variant="secondary" className="text-xs">
                          Obligatorio
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTipo && (
              <p className={`text-xs ${vigenciaConfig[selectedTipo.tipo_vigencia].color}`}>
                {vigenciaConfig[selectedTipo.tipo_vigencia].text}
                {selectedTipo.dias_alerta && selectedTipo.tipo_vigencia === 'CON_VENCIMIENTO' && (
                  <span className="ml-1">(alerta {selectedTipo.dias_alerta} días antes)</span>
                )}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripcion (opcional)</Label>
            <Input
              id="descripcion"
              placeholder="Ej: DNI anverso y reverso"
              value={uploadData.descripcion}
              onChange={(e) => setUploadData({ ...uploadData, descripcion: e.target.value })}
            />
          </div>

          {/* Fechas condicionales */}
          {tipoVigencia !== 'SIN_FECHAS' && (
            <div className={showVencimiento ? 'grid grid-cols-2 gap-4' : ''}>
              <div className="space-y-2">
                <Label htmlFor="fecha_emision">Fecha emision *</Label>
                <Input
                  id="fecha_emision"
                  type="date"
                  value={uploadData.fecha_emision}
                  onChange={(e) => setUploadData({ ...uploadData, fecha_emision: e.target.value })}
                />
              </div>
              {showVencimiento && (
                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">Fecha vencimiento *</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={uploadData.fecha_vencimiento}
                    onChange={(e) => setUploadData({ ...uploadData, fecha_vencimiento: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onUpload} disabled={uploading || !uploadFile}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Subiendo...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Subir</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Subido AlertDialog ────────────────────────────────────────────────

interface DeleteSubidoDialogProps {
  documentoSubidoToDelete: DocumentoSubido | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteSubidoDialog({
  documentoSubidoToDelete,
  onOpenChange,
  onConfirm,
}: DeleteSubidoDialogProps) {
  return (
    <AlertDialog open={!!documentoSubidoToDelete} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar Documento</AlertDialogTitle>
          <AlertDialogDescription>
            Se marcara como eliminado el documento &quot;{documentoSubidoToDelete?.tipo_documento_empleado?.nombre || documentoSubidoToDelete?.descripcion || 'seleccionado'}&quot; y todas sus versiones.
            El archivo se conserva para trazabilidad.
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

// ─── Nueva Versión Dialog ─────────────────────────────────────────────────────

interface NuevaVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nuevaVersionDoc: DocumentoSubido | null;
  nuevaVersionFile: File | null;
  nuevaVersionMotivo: string;
  setNuevaVersionMotivo: (v: string) => void;
  nuevaVersionFileRef: React.RefObject<HTMLInputElement | null>;
  subiendoVersion: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export function NuevaVersionDialog({
  open,
  onOpenChange,
  nuevaVersionDoc,
  nuevaVersionFile,
  nuevaVersionMotivo,
  setNuevaVersionMotivo,
  nuevaVersionFileRef,
  subiendoVersion,
  onFileSelect,
  onSubmit,
}: NuevaVersionDialogProps) {
  const docNombre = nuevaVersionDoc?.tipo_documento_empleado?.nombre
    || nuevaVersionDoc?.descripcion
    || 'Documento';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Versión de Documento</DialogTitle>
          <DialogDescription>
            Sube una nueva versión de &quot;{docNombre}&quot;.
            La versión anterior se conserva para trazabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              nuevaVersionFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => nuevaVersionFileRef.current?.click()}
          >
            {nuevaVersionFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileCheck className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{nuevaVersionFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(nuevaVersionFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Haz clic para seleccionar el nuevo archivo
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG (max 10MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            ref={nuevaVersionFileRef}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={onFileSelect}
          />

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la nueva versión *</Label>
            <Input
              id="motivo"
              placeholder="Ej: Documento incorrecto, Actualización de datos..."
              value={nuevaVersionMotivo}
              onChange={(e) => setNuevaVersionMotivo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={subiendoVersion || !nuevaVersionFile || !nuevaVersionMotivo.trim()}
          >
            {subiendoVersion ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Subiendo...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Subir nueva versión</>
            )}
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
  historial: VersionHistorial[];
  cargandoHistorial: boolean;
  onViewVersion: (url: string, nombre?: string) => void;
}

export function HistorialDialog({
  open,
  onOpenChange,
  historialDocNombre,
  historial,
  cargandoHistorial,
  onViewVersion,
}: HistorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de Versiones</DialogTitle>
          <DialogDescription>
            Todas las versiones de &quot;{historialDocNombre}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[400px] overflow-y-auto">
          {cargandoHistorial ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron versiones
            </p>
          ) : (
            <div className="space-y-3">
              {historial.map((v) => (
                <div
                  key={v.id}
                  className={`rounded-lg border p-3 ${
                    v.es_version_vigente && !v.eliminado
                      ? 'border-primary bg-primary/5'
                      : v.eliminado
                        ? 'border-destructive/30 bg-destructive/5 opacity-60'
                        : 'border-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          v.es_version_vigente && !v.eliminado
                            ? 'default'
                            : v.eliminado
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {v.eliminado
                          ? 'Eliminado'
                          : v.es_version_vigente
                            ? `v${v.version} (vigente)`
                            : `v${v.version}`}
                      </Badge>
                    </div>
                    {!v.eliminado && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onViewVersion(v.archivo_url, v.archivo_nombre || undefined)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.archivo_nombre || 'archivo'} - {new Date(v.fecha_carga).toLocaleDateString()}
                  </p>
                  {v.subido_por && (
                    <p className="text-xs text-muted-foreground">
                      Subido por: {v.subido_por.nombre_completo}
                    </p>
                  )}
                  {v.motivo_nueva_version && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Motivo: {v.motivo_nueva_version}
                    </p>
                  )}
                  {v.eliminado && v.eliminado_por && (
                    <p className="text-xs text-destructive mt-1">
                      Eliminado por: {v.eliminado_por.nombre_completo}
                      {v.eliminado_en && ` - ${new Date(v.eliminado_en).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
