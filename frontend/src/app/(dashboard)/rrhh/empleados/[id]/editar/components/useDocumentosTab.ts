'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import { exportToPdf, generatePdfFilename, exportMultipleToPdf } from '@/lib/pdf-export';
import type {
  PlantillaDocumento,
  TipoDocumentoEmpleado,
  DocumentoSubido,
  DocumentoGenerado,
  VersionHistorial,
  UploadData,
} from './documentos-tab.types';

export function useDocumentosTab(empleadoId: string) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [documentosSubidos, setDocumentosSubidos] = useState<DocumentoSubido[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoEmpleado[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaDocumento[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<DocumentoGenerado | null>(null);
  const [documentoSubidoToDelete, setDocumentoSubidoToDelete] = useState<DocumentoSubido | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingEstado, setUpdatingEstado] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [generandoMasivo, setGenerandoMasivo] = useState<'idle' | 'generating' | 'downloading'>('idle');

  // Estados para modal de subida de documento
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<UploadData>({
    tipo_documento_empleado_id: '',
    descripcion: '',
    fecha_emision: '',
    fecha_vencimiento: '',
  });

  // Estados para nueva versión
  const [showNuevaVersionDialog, setShowNuevaVersionDialog] = useState(false);
  const [nuevaVersionDoc, setNuevaVersionDoc] = useState<DocumentoSubido | null>(null);
  const [nuevaVersionFile, setNuevaVersionFile] = useState<File | null>(null);
  const [nuevaVersionMotivo, setNuevaVersionMotivo] = useState('');
  const [subiendoVersion, setSubiendoVersion] = useState(false);
  const nuevaVersionFileRef = useRef<HTMLInputElement>(null);

  // Estados para historial
  const [showHistorialDialog, setShowHistorialDialog] = useState(false);
  const [historial, setHistorial] = useState<VersionHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [historialDocNombre, setHistorialDocNombre] = useState('');

  // Preview de archivo
  const [previewFile, setPreviewFile] = useState<{ url: string; nombre: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, plantillasRes, tiposRes, subidosRes] = await Promise.all([
        api.get<DocumentoGenerado[]>(`/banco-documentos/empleado/${empleadoId}`),
        api.get<PlantillaDocumento[]>('/banco-documentos/plantillas'),
        api.get<TipoDocumentoEmpleado[]>('/masters/tipos-documento-empleado'),
        api.get<DocumentoSubido[]>(`/empleados/${empleadoId}/documentos`),
      ]);
      setDocumentos(docsRes);
      setPlantillas(plantillasRes);
      setTiposDocumento(tiposRes.filter(t => t.activo));
      setDocumentosSubidos(subidosRes);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar documentos'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Solo se recarga al cambiar empleadoId; fetchData se redefine en cada render
    // y no debe incluirse para evitar recargas innecesarias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoId]);

  const handleGenerate = async () => {
    if (!selectedPlantilla) {
      toast.error('Seleccione una plantilla');
      return;
    }
    try {
      setGenerating(true);
      await api.post('/banco-documentos/generar', {
        empleado_id: parseInt(empleadoId),
        plantilla_documento_id: parseInt(selectedPlantilla),
      });
      toast.success('Documento generado correctamente');
      setShowGenerateDialog(false);
      setSelectedPlantilla('');
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar documento'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = (doc: DocumentoGenerado) => {
    setPreviewTitle(doc.plantilla_documento.nombre);
    setPreviewContent(doc.contenido_generado || '');
    setShowPreviewDialog(true);
  };

  const handleUpdateEstado = async (docId: number, nuevoEstado: 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO') => {
    try {
      setUpdatingEstado(docId);
      await api.patch(`/banco-documentos/documento/${docId}/estado`, { estado: nuevoEstado });
      toast.success('Estado actualizado');
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al actualizar estado'));
    } finally {
      setUpdatingEstado(null);
    }
  };

  const handleDelete = async () => {
    if (!documentoToDelete) return;
    try {
      setDeletingId(documentoToDelete.id);
      await api.delete(`/banco-documentos/documento/${documentoToDelete.id}`);
      toast.success('Documento eliminado');
      setDocumentoToDelete(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar documento'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadClick = (docId: number) => {
    setSelectedDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocId) return;

    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingId(selectedDocId);
      await api.upload(`/banco-documentos/documento/${selectedDocId}/subir-firmado`, formData);
      toast.success('Documento firmado subido correctamente');
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al subir documento firmado'));
    } finally {
      setUploadingId(null);
      setSelectedDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadPdf = async (doc: DocumentoGenerado) => {
    try {
      await exportToPdf(doc.contenido_generado, {
        filename: generatePdfFilename(doc.plantilla_documento.nombre),
        margin: 10,
        pageSize: 'a4',
      });
      toast.success('PDF descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar PDF');
      console.error(error);
    }
  };

  const handleViewFirmado = (url: string) => {
    setPreviewFile({ url, nombre: 'Documento firmado' });
  };

  const handleGenerarMasivo = async () => {
    try {
      setGenerandoMasivo('generating');
      const result = await api.post<{
        generados: number;
        mensaje: string;
        documentos: unknown[];
      }>('/banco-documentos/generar-masivo', {
        empleado_id: parseInt(empleadoId),
        categoria: 'INGRESO',
      });

      if (result.generados > 0) {
        toast.success(`${result.generados} documento(s) generado(s)`);
        await fetchData();
      }

      setGenerandoMasivo('downloading');
      const contenidos = await api.get<{
        empleado: { nombre_completo: string; numero_documento: string };
        documentos: { nombre: string; contenido: string }[];
      }>(`/banco-documentos/empleado/${empleadoId}/contenidos-pdf?categoria=INGRESO`);

      if (contenidos.documentos.length === 0) {
        toast.warning('No hay documentos de ingreso para descargar');
        setGenerandoMasivo('idle');
        return;
      }

      const filename = generatePdfFilename('Documentos_Ingreso', contenidos.empleado.nombre_completo);
      await exportMultipleToPdf(contenidos.documentos, { filename, margin: 10, pageSize: 'a4' });
      toast.success('PDF descargado correctamente');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar documentos'));
    } finally {
      setGenerandoMasivo('idle');
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadFile(null);
    setUploadData({ tipo_documento_empleado_id: '', descripcion: '', fecha_emision: '', fecha_vencimiento: '' });
    setShowUploadDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) { toast.error('Seleccione un archivo'); return; }
    if (!uploadData.tipo_documento_empleado_id) { toast.error('Seleccione el tipo de documento'); return; }

    const selectedTipo = tiposDocumento.find(t => t.id.toString() === uploadData.tipo_documento_empleado_id);
    const tipoVigencia = selectedTipo?.tipo_vigencia || 'SIN_FECHAS';

    if (tipoVigencia === 'SOLO_EMISION' && !uploadData.fecha_emision) {
      toast.error('La fecha de emisión es obligatoria para este tipo de documento');
      return;
    }
    if (tipoVigencia === 'CON_VENCIMIENTO') {
      if (!uploadData.fecha_emision) { toast.error('La fecha de emisión es obligatoria para este tipo de documento'); return; }
      if (!uploadData.fecha_vencimiento) { toast.error('La fecha de vencimiento es obligatoria para este tipo de documento'); return; }
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tipo_documento_empleado_id', uploadData.tipo_documento_empleado_id);
      if (uploadData.descripcion) formData.append('descripcion', uploadData.descripcion);
      if (uploadData.fecha_emision) formData.append('fecha_emision', uploadData.fecha_emision);
      if (uploadData.fecha_vencimiento) formData.append('fecha_vencimiento', uploadData.fecha_vencimiento);

      await api.upload(`/empleados/${empleadoId}/documentos`, formData);
      toast.success('Documento subido correctamente');
      setShowUploadDialog(false);
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al subir documento'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocumentoSubido = async () => {
    if (!documentoSubidoToDelete) return;
    try {
      setDeletingId(documentoSubidoToDelete.id);
      await api.delete(`/empleados/${empleadoId}/documentos/${documentoSubidoToDelete.id}`);
      toast.success('Documento eliminado');
      setDocumentoSubidoToDelete(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar documento'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDocumentoSubido = (url: string, nombre?: string) => {
    setPreviewFile({ url, nombre: nombre || 'Documento' });
  };

  const handleOpenNuevaVersion = (doc: DocumentoSubido) => {
    setNuevaVersionDoc(doc);
    setNuevaVersionFile(null);
    setNuevaVersionMotivo('');
    setShowNuevaVersionDialog(true);
  };

  const handleNuevaVersionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setNuevaVersionFile(file);
  };

  const handleSubirNuevaVersion = async () => {
    if (!nuevaVersionDoc || !nuevaVersionFile || !nuevaVersionMotivo.trim()) return;
    try {
      setSubiendoVersion(true);
      const formData = new FormData();
      formData.append('file', nuevaVersionFile);
      formData.append('motivo', nuevaVersionMotivo.trim());
      await api.upload(`/empleados/${empleadoId}/documentos/${nuevaVersionDoc.id}/nueva-version`, formData);
      toast.success('Nueva versión subida correctamente');
      setShowNuevaVersionDialog(false);
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al subir nueva versión'));
    } finally {
      setSubiendoVersion(false);
    }
  };

  const handleVerHistorial = async (doc: DocumentoSubido) => {
    try {
      setCargandoHistorial(true);
      setHistorialDocNombre(doc.tipo_documento_empleado?.nombre || doc.descripcion || 'Documento');
      setShowHistorialDialog(true);
      const data = await api.get<VersionHistorial[]>(`/empleados/${empleadoId}/documentos/${doc.id}/historial`);
      setHistorial(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar historial'));
    } finally {
      setCargandoHistorial(false);
    }
  };

  const getEstadoVencimiento = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) return { estado: 'sin_vencimiento', label: 'Sin venc.', color: 'text-muted-foreground' };

    const [y, m, d] = fechaVencimiento.split('T')[0].split('-').map(Number);
    const vencimiento = new Date(y, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return { estado: 'vencido', label: 'Vencido', color: 'text-destructive' };
    if (diasRestantes <= 30) return { estado: 'por_vencer', label: `${diasRestantes}d`, color: 'text-orange-500' };
    return { estado: 'vigente', label: 'Vigente', color: 'text-green-600' };
  };

  // Derived state
  const documentosPorCategoria = documentos.reduce((acc, doc) => {
    const categoria = doc.plantilla_documento.categoria;
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(doc);
    return acc;
  }, {} as Record<string, DocumentoGenerado[]>);

  const plantillasDisponibles = plantillas.filter(
    p => !documentos.some(d => d.plantilla_documento_id === p.id)
  );

  return {
    // State
    loading,
    generating,
    documentos,
    documentosSubidos,
    tiposDocumento,
    plantillasDisponibles,
    selectedPlantilla,
    setSelectedPlantilla,
    showGenerateDialog,
    setShowGenerateDialog,
    showPreviewDialog,
    setShowPreviewDialog,
    previewContent,
    previewTitle,
    exportingPdf,
    setExportingPdf,
    documentoToDelete,
    setDocumentoToDelete,
    documentoSubidoToDelete,
    setDocumentoSubidoToDelete,
    deletingId,
    updatingEstado,
    uploadingId,
    fileInputRef,
    uploadFileInputRef,
    generandoMasivo,
    showUploadDialog,
    setShowUploadDialog,
    uploading,
    uploadFile,
    uploadData,
    setUploadData,
    showNuevaVersionDialog,
    setShowNuevaVersionDialog,
    nuevaVersionDoc,
    nuevaVersionFile,
    nuevaVersionMotivo,
    setNuevaVersionMotivo,
    subiendoVersion,
    nuevaVersionFileRef,
    showHistorialDialog,
    setShowHistorialDialog,
    historial,
    cargandoHistorial,
    historialDocNombre,
    previewFile,
    setPreviewFile,
    documentosPorCategoria,
    // Handlers
    handleGenerate,
    handlePreview,
    handleUpdateEstado,
    handleDelete,
    handleUploadClick,
    handleFileChange,
    handleDownloadPdf,
    handleViewFirmado,
    handleGenerarMasivo,
    handleOpenUploadDialog,
    handleFileSelect,
    handleUploadDocument,
    handleDeleteDocumentoSubido,
    handleViewDocumentoSubido,
    handleOpenNuevaVersion,
    handleNuevaVersionFileSelect,
    handleSubirNuevaVersion,
    handleVerHistorial,
    getEstadoVencimiento,
  };
}
