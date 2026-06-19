'use client';

import { Loader2 } from 'lucide-react';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { usePostulanteDetalle } from './hooks/usePostulanteDetalle';
import { PostulanteHeader } from './components/PostulanteHeader';
import { PostulanteMissingAlert } from './components/PostulanteMissingAlert';
import { PostulanteInfoCards } from './components/PostulanteInfoCards';
import { EvaluacionesCard } from './components/EvaluacionesCard';
import { DocumentosCard } from './components/DocumentosCard';
import {
  RejectDialog,
  DeleteEvalDialog,
  DeleteDocDialog,
  NuevaVersionDialog,
  HistorialDialog,
} from './components/PostulanteDialogs';

export default function PostulanteDetallePage() {
  const h = usePostulanteDetalle();

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!h.postulante) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Postulante no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PostulanteHeader
        id={h.id}
        postulante={h.postulante}
        actionLoading={h.actionLoading}
        puedeAprobar={h.puedeAprobar}
        puedeRechazar={h.puedeRechazar}
        puedeConvertir={h.puedeConvertir}
        missingRequirements={h.missingRequirements}
        onBack={() => h.router.back()}
        onAprobar={h.handleAprobar}
        onRechazar={() => h.setRejectDialog(true)}
        onVolverAProceso={h.handleVolverAProceso}
      />

      {h.postulante.estado === 'EN_PROCESO' && (
        <PostulanteMissingAlert missingRequirements={h.missingRequirements} />
      )}

      <PostulanteInfoCards postulante={h.postulante} />

      <EvaluacionesCard
        postulante={h.postulante}
        tiposEvaluacion={h.tiposEvaluacion}
        promedio={h.promedio}
        evalObligatorias={h.evalObligatorias}
        evalsFaltantes={h.evalsFaltantes}
        puedeEditar={h.puedeEditar}
        expandedEvalTipoId={h.expandedEvalTipoId}
        setExpandedEvalTipoId={h.setExpandedEvalTipoId}
        evalFormData={h.evalFormData}
        setEvalFormData={h.setEvalFormData}
        evalArchivo={h.evalArchivo}
        setEvalArchivo={h.setEvalArchivo}
        savingEvalTipoId={h.savingEvalTipoId}
        evalFileInputRef={h.evalFileInputRef}
        onGuardarEvaluacion={h.handleGuardarEvaluacion}
        onEliminarEvaluacion={h.setDeleteEvalId}
        onPreview={h.handlePreview}
        onDownload={h.handleDownload}
      />

      <DocumentosCard
        postulante={h.postulante}
        tiposDocumento={h.tiposDocumento}
        documentos={h.documentos}
        obligatorios={h.obligatorios}
        docsFaltantes={h.docsFaltantes}
        uploadingTipoId={h.uploadingTipoId}
        deletingDocId={h.deletingDocId}
        onDirectUpload={h.handleDirectUpload}
        onDeleteDoc={h.handleDeleteDoc}
        onOpenNuevaVersion={h.handleOpenNuevaVersion}
        onVerHistorial={h.handleVerHistorial}
        onPreview={h.handlePreview}
        onDownload={h.handleDownload}
      />

      <RejectDialog
        open={h.rejectDialog}
        onOpenChange={h.setRejectDialog}
        motivoRechazo={h.motivoRechazo}
        setMotivoRechazo={h.setMotivoRechazo}
        actionLoading={h.actionLoading}
        onRechazar={h.handleRechazar}
      />

      <DeleteEvalDialog
        open={!!h.deleteEvalId}
        onOpenChange={(open) => !open && h.setDeleteEvalId(null)}
        actionLoading={h.actionLoading}
        onEliminar={h.handleEliminarEvaluacion}
      />

      <DeleteDocDialog
        open={h.deleteDocDialog}
        onOpenChange={(v) => {
          h.setDeleteDocDialog(v);
          if (!v) h.setDeleteDocTarget(null);
        }}
        deleteDocTarget={h.deleteDocTarget}
        deleteDocMotivo={h.deleteDocMotivo}
        setDeleteDocMotivo={h.setDeleteDocMotivo}
        deletingDocId={h.deletingDocId}
        onConfirm={h.handleConfirmDeleteDoc}
      />

      <NuevaVersionDialog
        open={h.showNuevaVersionDialog}
        onOpenChange={h.setShowNuevaVersionDialog}
        nuevaVersionDoc={h.nuevaVersionDoc}
        nuevaVersionFile={h.nuevaVersionFile}
        setNuevaVersionFile={h.setNuevaVersionFile}
        nuevaVersionMotivo={h.nuevaVersionMotivo}
        setNuevaVersionMotivo={h.setNuevaVersionMotivo}
        subiendoVersion={h.subiendoVersion}
        nuevaVersionFileRef={h.nuevaVersionFileRef}
        onSubir={h.handleSubirNuevaVersion}
      />

      <HistorialDialog
        open={h.showHistorialDialog}
        onOpenChange={h.setShowHistorialDialog}
        historialDocNombre={h.historialDocNombre}
        historial={h.historial}
        cargandoHistorial={h.cargandoHistorial}
        onPreview={h.handlePreview}
      />

      <FilePreviewModal
        open={h.previewIndex >= 0}
        onOpenChange={(open) => { if (!open) h.setPreviewIndex(-1); }}
        files={h.allPreviewFiles}
        initialIndex={h.previewIndex >= 0 ? h.previewIndex : 0}
      />
    </div>
  );
}
