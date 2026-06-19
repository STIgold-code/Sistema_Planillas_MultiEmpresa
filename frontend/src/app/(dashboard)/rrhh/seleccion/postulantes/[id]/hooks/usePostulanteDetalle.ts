'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Postulante, TipoEvaluacionMaestro, TipoDocumentoEmpleado, PostulanteDocumento, PostulanteDocumentoHistorial } from '@/types';
import { toast } from 'sonner';

export function usePostulanteDetalle() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [postulante, setPostulante] = useState<Postulante | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [tiposEvaluacion, setTiposEvaluacion] = useState<TipoEvaluacionMaestro[]>([]);
  const [deleteEvalId, setDeleteEvalId] = useState<number | null>(null);
  const [promedio, setPromedio] = useState<{ promedio: string | null; total_evaluaciones: number } | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const [expandedEvalTipoId, setExpandedEvalTipoId] = useState<number | null>(null);
  const [evalFormData, setEvalFormData] = useState({ puntaje: '', comentario: '' });
  const [evalArchivo, setEvalArchivo] = useState<File | null>(null);
  const [savingEvalTipoId, setSavingEvalTipoId] = useState<number | null>(null);
  const evalFileInputRef = useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<PostulanteDocumento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoEmpleado[]>([]);
  const [uploadingTipoId, setUploadingTipoId] = useState<number | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  const [deleteDocDialog, setDeleteDocDialog] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<PostulanteDocumento | null>(null);
  const [deleteDocMotivo, setDeleteDocMotivo] = useState('');

  const [showNuevaVersionDialog, setShowNuevaVersionDialog] = useState(false);
  const [nuevaVersionDoc, setNuevaVersionDoc] = useState<PostulanteDocumento | null>(null);
  const [nuevaVersionFile, setNuevaVersionFile] = useState<File | null>(null);
  const [nuevaVersionMotivo, setNuevaVersionMotivo] = useState('');
  const [subiendoVersion, setSubiendoVersion] = useState(false);
  const nuevaVersionFileRef = useRef<HTMLInputElement>(null);

  const [showHistorialDialog, setShowHistorialDialog] = useState(false);
  const [historial, setHistorial] = useState<PostulanteDocumentoHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [historialDocNombre, setHistorialDocNombre] = useState('');

  const fetchPostulante = async () => {
    try {
      const response = await api.get<Postulante>(`/postulantes/${id}`);
      setPostulante(response);
    } catch (error) {
      console.error('Error fetching postulante:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPromedio = async () => {
    try {
      const response = await api.get<{ promedio: string | null; total_evaluaciones: number }>(
        `/postulantes/${id}/evaluaciones/promedio`,
      );
      setPromedio(response);
    } catch (error) {
      console.error('Error fetching promedio:', error);
    }
  };

  const fetchTiposEvaluacion = async () => {
    try {
      const response = await api.get<TipoEvaluacionMaestro[]>('/masters/tipos-evaluacion');
      setTiposEvaluacion(response);
    } catch (error) {
      console.error('Error fetching tipos evaluacion:', error);
    }
  };

  const fetchDocumentos = async () => {
    try {
      const data = await api.get<PostulanteDocumento[]>(`/postulantes/${id}/documentos`);
      setDocumentos(data);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    }
  };

  const fetchTiposDocumento = async () => {
    try {
      const data = await api.get<TipoDocumentoEmpleado[]>('/masters/tipos-documento-empleado');
      setTiposDocumento(data.filter(t => t.activo && t.aplica_seleccion));
    } catch (error) {
      console.error('Error al cargar tipos de documento:', error);
    }
  };

  useEffect(() => {
    fetchPostulante();
    fetchPromedio();
    fetchTiposEvaluacion();
    fetchDocumentos();
    fetchTiposDocumento();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAprobar = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/postulantes/${id}/estado`, { nuevo_estado: 'APROBADO' });
      toast.success('Postulante aprobado');
      fetchPostulante();
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVolverAProceso = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/postulantes/${id}/estado`, { nuevo_estado: 'EN_PROCESO' });
      toast.success('Postulante devuelto a En Proceso');
      fetchPostulante();
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/postulantes/${id}/estado`, { nuevo_estado: 'RECHAZADO', motivo: motivoRechazo });
      toast.success('Postulante rechazado');
      setRejectDialog(false);
      fetchPostulante();
    } catch (error: any) {
      toast.error(error.message || 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuardarEvaluacion = async (tipoEvalId: number) => {
    setSavingEvalTipoId(tipoEvalId);
    try {
      let archivoUrl: string | undefined;
      let archivoNombre: string | undefined;

      if (evalArchivo) {
        const formData = new FormData();
        formData.append('file', evalArchivo);
        const uploadRes = await api.upload<{
          success: boolean;
          file: { url: string; originalname: string; filename: string };
        }>('/uploads/evaluaciones', formData);
        archivoUrl = uploadRes.file.url;
        archivoNombre = uploadRes.file.originalname;
      }

      await api.post(`/postulantes/${id}/evaluacion`, {
        tipo_evaluacion_id: tipoEvalId,
        puntaje: evalFormData.puntaje ? parseFloat(evalFormData.puntaje) : undefined,
        comentario: evalFormData.comentario || undefined,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre,
      });
      toast.success('Evaluacion registrada');
      setExpandedEvalTipoId(null);
      setEvalFormData({ puntaje: '', comentario: '' });
      setEvalArchivo(null);
      fetchPostulante();
      fetchPromedio();
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar evaluacion');
    } finally {
      setSavingEvalTipoId(null);
    }
  };

  const handleEliminarEvaluacion = async () => {
    if (!deleteEvalId) return;
    setActionLoading(true);
    try {
      await api.delete(`/postulantes/${id}/evaluacion/${deleteEvalId}`);
      toast.success('Evaluacion eliminada');
      setDeleteEvalId(null);
      fetchPostulante();
      fetchPromedio();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar evaluacion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectUpload = async (tipoDocId: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5MB');
      return;
    }
    setUploadingTipoId(tipoDocId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo_documento_empleado_id', tipoDocId.toString());
      await api.upload(`/postulantes/${id}/documentos`, formData);
      toast.success('Documento subido correctamente');
      fetchDocumentos();
    } catch (error: any) {
      toast.error(error.message || 'Error al subir documento');
    } finally {
      setUploadingTipoId(null);
    }
  };

  const handleDeleteDoc = (doc: PostulanteDocumento) => {
    setDeleteDocTarget(doc);
    setDeleteDocMotivo('');
    setDeleteDocDialog(true);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    setDeletingDocId(deleteDocTarget.id);
    try {
      await api.delete(`/postulantes/${id}/documentos/${deleteDocTarget.id}`, {
        motivo: deleteDocMotivo || undefined,
      });
      toast.success('Documento eliminado');
      setDeleteDocDialog(false);
      setDeleteDocTarget(null);
      fetchDocumentos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar documento');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleOpenNuevaVersion = (doc: PostulanteDocumento) => {
    setNuevaVersionDoc(doc);
    setNuevaVersionFile(null);
    setNuevaVersionMotivo('');
    setShowNuevaVersionDialog(true);
  };

  const handleSubirNuevaVersion = async () => {
    if (!nuevaVersionDoc || !nuevaVersionFile || !nuevaVersionMotivo.trim()) return;
    try {
      setSubiendoVersion(true);
      const formData = new FormData();
      formData.append('file', nuevaVersionFile);
      formData.append('motivo', nuevaVersionMotivo.trim());
      await api.upload(`/postulantes/${id}/documentos/${nuevaVersionDoc.id}/nueva-version`, formData);
      toast.success('Nueva version subida correctamente');
      setShowNuevaVersionDialog(false);
      fetchDocumentos();
    } catch (error: any) {
      toast.error(error.message || 'Error al subir nueva version');
    } finally {
      setSubiendoVersion(false);
    }
  };

  const handleVerHistorial = async (doc: PostulanteDocumento) => {
    try {
      setCargandoHistorial(true);
      setHistorialDocNombre(doc.tipo_documento_empleado?.nombre || doc.descripcion || 'Documento');
      setShowHistorialDialog(true);
      const data = await api.get<PostulanteDocumentoHistorial[]>(
        `/postulantes/${id}/documentos/${doc.id}/historial`,
      );
      setHistorial(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar historial');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleDownload = async (url: string, nombre: string) => {
    try {
      const apiPath = url.replace(process.env.NEXT_PUBLIC_API_URL || '', '');
      const blob = await api.getBlob(apiPath);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handlePreview = (url: string, _nombre: string) => {
    const index = allPreviewFiles.findIndex(f => f.archivo_url === url);
    setPreviewIndex(index >= 0 ? index : 0);
  };

  // Derived
  const puedeRechazar = postulante
    ? postulante.estado !== 'RECHAZADO' && !postulante.empleado_id
    : false;
  const puedeConvertir = postulante
    ? postulante.estado === 'APROBADO' && !postulante.empleado_id
    : false;

  const evalObligatorias = tiposEvaluacion.filter(t => t.es_obligatorio);
  const tipoIdsEvaluados = new Set(
    (postulante?.evaluaciones_detalle || [])
      .map(e => e.tipo_evaluacion_id)
      .filter((eid): eid is number => eid !== null && eid !== undefined),
  );
  const evalsFaltantes = evalObligatorias.filter(t => !tipoIdsEvaluados.has(t.id));

  const obligatorios = tiposDocumento.filter(t => t.es_obligatorio);
  const tipoIdsSubidos = new Set(
    documentos.map(d => d.tipo_documento_empleado_id).filter((did): did is number => did !== null),
  );
  const docsFaltantes = obligatorios.filter(t => !tipoIdsSubidos.has(t.id));

  const missingRequirements: string[] = [];
  if (evalsFaltantes.length > 0) missingRequirements.push(`Evaluaciones: ${evalsFaltantes.map(e => e.nombre).join(', ')}`);
  if (docsFaltantes.length > 0) missingRequirements.push(`Documentos: ${docsFaltantes.map(d => d.nombre).join(', ')}`);

  const puedeAprobar = postulante
    ? postulante.estado === 'EN_PROCESO' && missingRequirements.length === 0
    : false;
  const puedeEditar = postulante
    ? postulante.estado === 'EN_PROCESO' && !postulante.empleado_id
    : false;

  const allPreviewFiles = [
    ...documentos.map(d => ({ archivo_url: d.archivo_url, archivo_nombre: d.archivo_nombre || 'documento' })),
    ...(postulante?.evaluaciones_detalle || [])
      .filter(e => e.archivo_url)
      .map(e => ({ archivo_url: e.archivo_url!, archivo_nombre: e.archivo_nombre || 'archivo' })),
  ];

  return {
    id,
    router,
    postulante,
    loading,
    actionLoading,
    tiposEvaluacion,
    promedio,
    puedeAprobar,
    puedeRechazar,
    puedeConvertir,
    puedeEditar,
    missingRequirements,
    evalsFaltantes,
    evalObligatorias,
    docsFaltantes,
    obligatorios,
    allPreviewFiles,
    previewIndex,
    setPreviewIndex,
    rejectDialog,
    setRejectDialog,
    motivoRechazo,
    setMotivoRechazo,
    deleteEvalId,
    setDeleteEvalId,
    expandedEvalTipoId,
    setExpandedEvalTipoId,
    evalFormData,
    setEvalFormData,
    evalArchivo,
    setEvalArchivo,
    savingEvalTipoId,
    evalFileInputRef,
    documentos,
    tiposDocumento,
    uploadingTipoId,
    deletingDocId,
    deleteDocDialog,
    setDeleteDocDialog,
    deleteDocTarget,
    setDeleteDocTarget,
    deleteDocMotivo,
    setDeleteDocMotivo,
    showNuevaVersionDialog,
    setShowNuevaVersionDialog,
    nuevaVersionDoc,
    nuevaVersionFile,
    setNuevaVersionFile,
    nuevaVersionMotivo,
    setNuevaVersionMotivo,
    subiendoVersion,
    nuevaVersionFileRef,
    showHistorialDialog,
    setShowHistorialDialog,
    historial,
    cargandoHistorial,
    historialDocNombre,
    handleAprobar,
    handleVolverAProceso,
    handleRechazar,
    handleGuardarEvaluacion,
    handleEliminarEvaluacion,
    handleDirectUpload,
    handleDeleteDoc,
    handleConfirmDeleteDoc,
    handleOpenNuevaVersion,
    handleSubirNuevaVersion,
    handleVerHistorial,
    handleDownload,
    handlePreview,
  };
}
