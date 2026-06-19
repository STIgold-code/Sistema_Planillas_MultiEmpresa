'use client';

import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Plus, FileStack, FolderUp } from 'lucide-react';

import { useDocumentosTab } from './useDocumentosTab';
import { DocumentosSubidosCard } from './documentos-subidos-card';
import { DocumentosGeneradosSection } from './documentos-generados-section';
import {
  GenerateDialog,
  PreviewDialog,
  UploadDialog,
  DeleteGeneradoDialog,
  DeleteSubidoDialog,
  NuevaVersionDialog,
  HistorialDialog,
} from './documentos-dialogs';

interface EmpleadoDocumentosTabProps {
  empleadoId: string;
}

export function EmpleadoDocumentosTab({ empleadoId }: EmpleadoDocumentosTabProps) {
  const state = useDocumentosTab(empleadoId);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = state.documentos.length === 0 && state.documentosSubidos.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Documentos del Empleado</h3>
          <p className="text-sm text-muted-foreground">
            {state.documentos.length} generado(s), {state.documentosSubidos.length} subido(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={state.handleGenerarMasivo}
            disabled={state.generandoMasivo !== 'idle'}
          >
            {state.generandoMasivo === 'generating' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : state.generandoMasivo === 'downloading' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Descargando...</>
            ) : (
              <><FileStack className="h-4 w-4 mr-2" />Generar Docs. Ingreso</>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={state.handleOpenUploadDialog}>
            <FolderUp className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
          <Button
            type="button"
            onClick={() => state.setShowGenerateDialog(true)}
            disabled={state.plantillasDisponibles.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generar Documento
          </Button>
        </div>
      </div>

      {/* Documentos Subidos */}
      {state.documentosSubidos.length > 0 && (
        <DocumentosSubidosCard
          documentosSubidos={state.documentosSubidos}
          deletingId={state.deletingId}
          getEstadoVencimiento={state.getEstadoVencimiento}
          onView={state.handleViewDocumentoSubido}
          onNuevaVersion={state.handleOpenNuevaVersion}
          onHistorial={state.handleVerHistorial}
          onDelete={state.setDocumentoSubidoToDelete}
        />
      )}

      {/* Documentos Generados / Empty state */}
      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay documentos</p>
            <div className="flex gap-2 mt-4">
              <Button type="button" variant="outline" onClick={state.handleOpenUploadDialog}>
                <FolderUp className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => state.setShowGenerateDialog(true)}
                disabled={state.plantillasDisponibles.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generar Documento
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : state.documentos.length > 0 ? (
        <DocumentosGeneradosSection
          documentosPorCategoria={state.documentosPorCategoria}
          updatingEstado={state.updatingEstado}
          uploadingId={state.uploadingId}
          deletingId={state.deletingId}
          onUpdateEstado={state.handleUpdateEstado}
          onPreview={state.handlePreview}
          onDownloadPdf={state.handleDownloadPdf}
          onUploadClick={state.handleUploadClick}
          onViewFirmado={state.handleViewFirmado}
          onDelete={state.setDocumentoToDelete}
        />
      ) : null}

      {/* Dialogs */}
      <GenerateDialog
        open={state.showGenerateDialog}
        onOpenChange={state.setShowGenerateDialog}
        plantillasDisponibles={state.plantillasDisponibles}
        selectedPlantilla={state.selectedPlantilla}
        onSelectPlantilla={state.setSelectedPlantilla}
        generating={state.generating}
        onGenerate={state.handleGenerate}
      />

      <PreviewDialog
        open={state.showPreviewDialog}
        onOpenChange={state.setShowPreviewDialog}
        previewTitle={state.previewTitle}
        previewContent={state.previewContent}
        exportingPdf={state.exportingPdf}
        setExportingPdf={state.setExportingPdf}
      />

      <UploadDialog
        open={state.showUploadDialog}
        onOpenChange={state.setShowUploadDialog}
        uploadFile={state.uploadFile}
        uploadFileInputRef={state.uploadFileInputRef}
        uploadData={state.uploadData}
        setUploadData={state.setUploadData}
        tiposDocumento={state.tiposDocumento}
        uploading={state.uploading}
        onFileSelect={state.handleFileSelect}
        onUpload={state.handleUploadDocument}
      />

      <DeleteGeneradoDialog
        documentoToDelete={state.documentoToDelete}
        onOpenChange={() => state.setDocumentoToDelete(null)}
        onConfirm={state.handleDelete}
      />

      <DeleteSubidoDialog
        documentoSubidoToDelete={state.documentoSubidoToDelete}
        onOpenChange={() => state.setDocumentoSubidoToDelete(null)}
        onConfirm={state.handleDeleteDocumentoSubido}
      />

      <NuevaVersionDialog
        open={state.showNuevaVersionDialog}
        onOpenChange={state.setShowNuevaVersionDialog}
        nuevaVersionDoc={state.nuevaVersionDoc}
        nuevaVersionFile={state.nuevaVersionFile}
        nuevaVersionMotivo={state.nuevaVersionMotivo}
        setNuevaVersionMotivo={state.setNuevaVersionMotivo}
        nuevaVersionFileRef={state.nuevaVersionFileRef}
        subiendoVersion={state.subiendoVersion}
        onFileSelect={state.handleNuevaVersionFileSelect}
        onSubmit={state.handleSubirNuevaVersion}
      />

      <HistorialDialog
        open={state.showHistorialDialog}
        onOpenChange={state.setShowHistorialDialog}
        historialDocNombre={state.historialDocNombre}
        historial={state.historial}
        cargandoHistorial={state.cargandoHistorial}
        onViewVersion={state.handleViewDocumentoSubido}
      />

      {/* Hidden file input for signed document upload */}
      <input
        type="file"
        ref={state.fileInputRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={state.handleFileChange}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        open={!!state.previewFile}
        onOpenChange={(open) => { if (!open) state.setPreviewFile(null); }}
        files={state.previewFile ? [{ archivo_url: state.previewFile.url, archivo_nombre: state.previewFile.nombre }] : []}
        initialIndex={0}
      />
    </div>
  );
}
