'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { CarnetSucamec, CategoriaSucamec, CategoriaSucamecOption } from '@/types';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { toDateString } from '@/lib/utils';

export const CATEGORIAS_SUCAMEC: CategoriaSucamecOption[] = [
  { value: 'BASICO', label: 'Agente Basico' },
  { value: 'ESPECIALIZADO', label: 'Agente Especializado' },
  { value: 'RESGUARDO', label: 'Resguardo Personal' },
  { value: 'PROTECCION', label: 'Proteccion de Instalaciones' },
  { value: 'TRANSPORTE', label: 'Transporte de Valores' },
  { value: 'TECNOLOGIA', label: 'Vigilancia Electronica' },
  { value: 'CAPACITADOR', label: 'Capacitador/Instructor' },
];

export interface CarnetForm {
  numero_carnet: string;
  categoria: CategoriaSucamec;
  fecha_emision: string;
  fecha_vencimiento: string;
  observaciones: string;
  documento_id?: number;
}

export interface DocumentoSinVincular {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  descripcion?: string;
  created_at: string;
}

export const initialFormState: CarnetForm = {
  numero_carnet: '',
  categoria: 'BASICO',
  fecha_emision: '',
  fecha_vencimiento: '',
  observaciones: '',
  documento_id: undefined,
};

export function useEmpleadoSucamec(empleadoId: number, onUpdate?: () => void) {
  const [carnets, setCarnets] = useState<CarnetSucamec[]>([]);
  const [documentosSinVincular, setDocumentosSinVincular] = useState<DocumentoSinVincular[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showSuspenderModal, setShowSuspenderModal] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [showVincularModal, setShowVincularModal] = useState(false);

  // Estado del formulario
  const [form, setForm] = useState<CarnetForm>(initialFormState);
  const [selectedCarnet, setSelectedCarnet] = useState<CarnetSucamec | null>(null);
  const [motivo, setMotivo] = useState('');
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | undefined>(undefined);
  const [carnetFile, setCarnetFile] = useState<File | null>(null);

  const carnetVigente = carnets.find(c => c.estado === 'VIGENTE');
  const historial = carnets.filter(c => c.estado !== 'VIGENTE');

  const fetchCarnets = useCallback(async () => {
    try {
      const response = await api.get<{ data: CarnetSucamec[] }>(`/sucamec?empleado_id=${empleadoId}&limit=100`);
      setCarnets(response.data || []);
    } catch (error: any) {
      console.error('Error al cargar carnets SUCAMEC:', error);
      toast.error('Error al cargar carnets SUCAMEC');
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  const fetchDocumentosSinVincular = useCallback(async () => {
    try {
      const docs = await api.get<DocumentoSinVincular[]>(`/sucamec/empleado/${empleadoId}/documentos-sin-vincular`);
      setDocumentosSinVincular(docs || []);
    } catch (error: any) {
      console.error('Error al cargar documentos sin vincular:', error);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchCarnets();
    fetchDocumentosSinVincular();
  }, [fetchCarnets, fetchDocumentosSinVincular]);

  const getDiasParaVencer = (fechaVencimiento: string): number => {
    const [y, m, d] = fechaVencimiento.split('T')[0].split('-');
    const fechaLocal = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return differenceInDays(fechaLocal, hoy);
  };

  const proximoAVencer = carnetVigente
    ? getDiasParaVencer(carnetVigente.fecha_vencimiento) <= 30 &&
      getDiasParaVencer(carnetVigente.fecha_vencimiento) >= 0
    : false;

  const yaVencido = carnetVigente
    ? getDiasParaVencer(carnetVigente.fecha_vencimiento) < 0
    : false;

  const resetForm = () => {
    setForm(initialFormState);
    setMotivo('');
    setSelectedDocumentoId(undefined);
    setCarnetFile(null);
  };

  const handleNuevo = () => {
    resetForm();
    const hoy = toDateString(new Date());
    setForm(prev => ({ ...prev, fecha_emision: hoy }));
    setShowNuevoModal(true);
  };

  const handleRenovar = (carnet: CarnetSucamec) => {
    resetForm();
    const hoy = toDateString(new Date());
    setSelectedCarnet(carnet);
    setForm({
      numero_carnet: '',
      categoria: carnet.categoria,
      fecha_emision: hoy,
      fecha_vencimiento: '',
      observaciones: '',
      documento_id: undefined,
    });
    setShowRenovarModal(true);
  };

  const handleVerDetalle = (carnet: CarnetSucamec) => {
    setSelectedCarnet(carnet);
    setShowDetalleModal(true);
  };

  const handleSuspender = (carnet: CarnetSucamec) => {
    setSelectedCarnet(carnet);
    setMotivo('');
    setShowSuspenderModal(true);
  };

  const handleAnular = (carnet: CarnetSucamec) => {
    setSelectedCarnet(carnet);
    setMotivo('');
    setShowAnularModal(true);
  };

  const handleVincular = (carnet: CarnetSucamec) => {
    setSelectedCarnet(carnet);
    setSelectedDocumentoId(undefined);
    fetchDocumentosSinVincular();
    setShowVincularModal(true);
  };

  const handleCrear = async () => {
    if (!form.numero_carnet || !form.fecha_emision || !form.fecha_vencimiento) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('empleado_id', String(empleadoId));
      formData.append('numero_carnet', form.numero_carnet.toUpperCase());
      formData.append('categoria', form.categoria);
      formData.append('fecha_emision', form.fecha_emision);
      formData.append('fecha_vencimiento', form.fecha_vencimiento);
      if (form.observaciones) formData.append('observaciones', form.observaciones);
      if (form.documento_id) formData.append('documento_id', String(form.documento_id));
      if (carnetFile) formData.append('file', carnetFile);

      await api.upload('/sucamec', formData);

      toast.success('Carnet SUCAMEC registrado correctamente');
      setShowNuevoModal(false);
      resetForm();
      fetchCarnets();
      fetchDocumentosSinVincular();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Error al crear carnet');
    } finally {
      setSaving(false);
    }
  };

  const handleRenovarSubmit = async () => {
    if (!selectedCarnet) return;
    if (!form.numero_carnet || !form.fecha_emision || !form.fecha_vencimiento) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      await api.post<CarnetSucamec>(`/sucamec/${selectedCarnet.id}/renovar`, {
        numero_carnet: form.numero_carnet.toUpperCase(),
        categoria: form.categoria,
        fecha_emision: form.fecha_emision,
        fecha_vencimiento: form.fecha_vencimiento,
        observaciones: form.observaciones || null,
        documento_id: form.documento_id || null,
      });

      toast.success('Carnet SUCAMEC renovado correctamente');
      setShowRenovarModal(false);
      resetForm();
      fetchCarnets();
      fetchDocumentosSinVincular();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al renovar carnet');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspenderSubmit = async () => {
    if (!selectedCarnet || !motivo) {
      toast.error('Ingrese el motivo de suspension');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/sucamec/${selectedCarnet.id}/suspender`, { motivo });
      toast.success('Carnet suspendido correctamente');
      setShowSuspenderModal(false);
      fetchCarnets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al suspender carnet');
    } finally {
      setSaving(false);
    }
  };

  const handleAnularSubmit = async () => {
    if (!selectedCarnet || !motivo) {
      toast.error('Ingrese el motivo de anulacion');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/sucamec/${selectedCarnet.id}/anular`, { motivo });
      toast.success('Carnet anulado correctamente');
      setShowAnularModal(false);
      fetchCarnets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al anular carnet');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivar = async (carnet: CarnetSucamec) => {
    try {
      await api.patch(`/sucamec/${carnet.id}/reactivar`, {});
      toast.success('Carnet reactivado correctamente');
      fetchCarnets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al reactivar carnet');
    }
  };

  const handleVincularSubmit = async () => {
    if (!selectedCarnet || !selectedDocumentoId) {
      toast.error('Seleccione un documento para vincular');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/sucamec/${selectedCarnet.id}/vincular-documento`, {
        documento_id: selectedDocumentoId,
      });
      toast.success('Documento vinculado correctamente');
      setShowVincularModal(false);
      fetchCarnets();
      fetchDocumentosSinVincular();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al vincular documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDesvincular = async (carnet: CarnetSucamec) => {
    try {
      await api.patch(`/sucamec/${carnet.id}/desvincular-documento`, {});
      toast.success('Documento desvinculado correctamente');
      fetchCarnets();
      fetchDocumentosSinVincular();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al desvincular documento');
    }
  };

  const getCategoriaLabel = (categoria: CategoriaSucamec) => {
    return CATEGORIAS_SUCAMEC.find(c => c.value === categoria)?.label || categoria;
  };

  return {
    // State
    carnets,
    documentosSinVincular,
    loading,
    saving,
    form,
    setForm,
    selectedCarnet,
    motivo,
    setMotivo,
    selectedDocumentoId,
    setSelectedDocumentoId,
    carnetFile,
    setCarnetFile,
    // Modales
    showNuevoModal,
    setShowNuevoModal,
    showRenovarModal,
    setShowRenovarModal,
    showDetalleModal,
    setShowDetalleModal,
    showSuspenderModal,
    setShowSuspenderModal,
    showAnularModal,
    setShowAnularModal,
    showVincularModal,
    setShowVincularModal,
    // Computed
    carnetVigente,
    historial,
    proximoAVencer,
    yaVencido,
    // Handlers
    getDiasParaVencer,
    getCategoriaLabel,
    handleNuevo,
    handleRenovar,
    handleVerDetalle,
    handleSuspender,
    handleAnular,
    handleVincular,
    handleCrear,
    handleRenovarSubmit,
    handleSuspenderSubmit,
    handleAnularSubmit,
    handleReactivar,
    handleVincularSubmit,
    handleDesvincular,
  };
}
