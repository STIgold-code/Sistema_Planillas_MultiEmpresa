'use client';

import { useState } from 'react';
import { api, getAccessToken } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Contrato, PlantillaContrato } from '@/types';
import { toast } from 'sonner';
import { toDateString, parseDateLocal } from '@/lib/utils';
import { Cliente, Sede, ContratoForm, initialFormState } from './contratos.types';

interface UseContratosCrudParams {
  empleadoId: number;
  sueldoBase?: number;
  clienteId?: number;
  sedeId?: number;
  cargoId?: number;
  onEmpleadoUpdate?: () => void;
  contratos: Contrato[];
  clientes: Cliente[];
  fetchContratos: () => Promise<void>;
  fetchPlantillas: () => Promise<PlantillaContrato[]>;
  fetchSedes: () => Promise<Sede[]>;
  setSedesFiltradas: React.Dispatch<React.SetStateAction<Sede[]>>;
  form: ContratoForm;
  setForm: React.Dispatch<React.SetStateAction<ContratoForm>>;
}

export function useContratosCrud({
  empleadoId,
  sueldoBase,
  clienteId,
  sedeId,
  cargoId,
  onEmpleadoUpdate,
  contratos,
  clientes,
  fetchContratos,
  fetchPlantillas,
  fetchSedes,
  setSedesFiltradas,
  form,
  setForm,
}: UseContratosCrudParams) {
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [showReingresoModal, setShowReingresoModal] = useState(false);
  const [showSolicitarCeseModal, setShowSolicitarCeseModal] = useState(false);

  const [ceseForm, setCeseForm] = useState({ tipo_cese_id: '', motivo: '', fecha_efectiva: '' });
  const [ceseFiles, setCeseFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const contratoVigente = contratos.find((c) => c.estado === 'ACTIVO');
  const ultimoContratoVencido = contratos.find((c) => c.estado === 'PENDIENTE');

  const generarDocumentoParaContrato = async (contratoData: Record<string, unknown>, plantillaId: string) => {
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/plantillas-contrato/${plantillaId}/generar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            empleado_id: empleadoId,
            contrato: contratoData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al generar documento');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contrato.docx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Documento generado y descargado');
    } catch {
      toast.error('Error al generar documento. Puede generarlo manualmente.');
    }
  };

  const handleNuevoContrato = async () => {
    const [plantillasActualizadas, sedesActualizadas] = await Promise.all([fetchPlantillas(), fetchSedes()]);
    const plantillaPredeterminada = plantillasActualizadas.find(
      (p) => p.tipo_contrato === 'SUJETO_A_MODALIDAD' && p.es_predeterminada && p.archivo_base_url
    ) || plantillasActualizadas.find((p) => p.archivo_base_url);

    const clienteIdStr = clienteId?.toString() || '';
    if (clienteIdStr) {
      const filtradas = sedesActualizadas.filter(s => s.cliente_id === clienteId);
      setSedesFiltradas(filtradas);
    } else {
      setSedesFiltradas([]);
    }

    setForm({
      ...initialFormState,
      remuneracion: sueldoBase?.toString() || '',
      fecha_inicio: toDateString(new Date()),
      plantilla_id: plantillaPredeterminada?.id.toString() || '',
      generar_documento: !!plantillaPredeterminada,
      cliente_id: clienteIdStr,
      sede_id: sedeId?.toString() || '',
    });
    setShowNuevoModal(true);
  };

  const handleCrearContrato = async () => {
    if (!form.tipo_contrato || !form.fecha_inicio) {
      toast.error('Complete los campos requeridos');
      return;
    }

    if (form.generar_documento && !form.plantilla_id) {
      toast.error('Seleccione una plantilla para generar el documento');
      return;
    }

    setSaving(true);
    try {
      await api.post('/contratos', {
        empleado_id: empleadoId,
        tipo_contrato: form.tipo_contrato,
        modalidad: form.modalidad || undefined,
        regimen_laboral: form.regimen_laboral || undefined,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : undefined,
        lugar_trabajo: form.lugar_trabajo || undefined,
        observaciones: form.observaciones || undefined,
        plantilla_id: form.plantilla_id ? parseInt(form.plantilla_id) : undefined,
      });
      toast.success('Contrato creado correctamente');
      setShowNuevoModal(false);

      const clienteSeleccionado = clientes.find(c => c.id.toString() === form.cliente_id);

      if (form.generar_documento && form.plantilla_id) {
        await generarDocumentoParaContrato(
          {
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            fecha_firma: form.fecha_inicio,
            remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
            empresa_cliente: clienteSeleccionado?.razon_social || '',
            lugar_trabajo: form.lugar_trabajo,
            tipo_contrato: form.tipo_contrato,
            modalidad: form.modalidad,
          },
          form.plantilla_id
        );
      }

      fetchContratos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear contrato'));
    } finally {
      setSaving(false);
    }
  };

  const handleRenovarClick = async () => {
    if (!contratoVigente) return;
    const plantillasActualizadas = await fetchPlantillas();
    const plantillaPredeterminada = plantillasActualizadas.find(
      (p) => p.tipo_contrato === contratoVigente.tipo_contrato && p.es_predeterminada && p.archivo_base_url
    ) || plantillasActualizadas.find((p) => p.archivo_base_url);

    const sedesActualizadas = await fetchSedes();
    const resolvedClienteId = contratoVigente.cliente_id ?? clienteId;
    const resolvedSedeId = sedeId;
    const clienteIdStr = resolvedClienteId?.toString() || '';
    if (clienteIdStr) {
      const filtradas = sedesActualizadas.filter(s => s.cliente_id === resolvedClienteId);
      setSedesFiltradas(filtradas);
    } else {
      setSedesFiltradas([]);
    }

    const fechaFinActual = contratoVigente.fecha_fin
      ? parseDateLocal(contratoVigente.fecha_fin)
      : new Date();
    const nuevaFechaInicio = new Date(fechaFinActual);
    nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 1);
    const nuevaFechaFin = new Date(nuevaFechaInicio);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 6);

    setForm({
      tipo_contrato: contratoVigente.tipo_contrato,
      modalidad: contratoVigente.modalidad || 'PRESENCIAL',
      fecha_inicio: toDateString(nuevaFechaInicio),
      fecha_fin: toDateString(nuevaFechaFin),
      remuneracion: contratoVigente.remuneracion?.toString() || sueldoBase?.toString() || '',
      cliente_id: clienteIdStr,
      sede_id: resolvedSedeId?.toString() || '',
      lugar_trabajo: contratoVigente.lugar_trabajo || '',
      observaciones: '',
      plantilla_id: plantillaPredeterminada?.id.toString() || '',
      generar_documento: !!plantillaPredeterminada,
      cargo_id: cargoId?.toString() || '',
      regimen_laboral: contratoVigente.regimen_laboral || '',
    });
    setShowRenovarModal(true);
  };

  const handleRenovarVencidoClick = async () => {
    if (!ultimoContratoVencido) return;
    const plantillasActualizadas = await fetchPlantillas();
    const plantillaPredeterminada = plantillasActualizadas.find(
      (p) => p.tipo_contrato === ultimoContratoVencido.tipo_contrato && p.es_predeterminada && p.archivo_base_url
    ) || plantillasActualizadas.find((p) => p.archivo_base_url);

    const sedesActualizadas = await fetchSedes();
    const resolvedClienteId = ultimoContratoVencido.cliente_id ?? clienteId;
    const resolvedSedeId = sedeId;
    const clienteIdStr = resolvedClienteId?.toString() || '';
    if (clienteIdStr) {
      const filtradas = sedesActualizadas.filter(s => s.cliente_id === resolvedClienteId);
      setSedesFiltradas(filtradas);
    } else {
      setSedesFiltradas([]);
    }

    const fechaFinActual = ultimoContratoVencido.fecha_fin
      ? parseDateLocal(ultimoContratoVencido.fecha_fin)
      : new Date();
    const nuevaFechaInicio = new Date(fechaFinActual);
    nuevaFechaInicio.setDate(nuevaFechaInicio.getDate() + 1);
    const nuevaFechaFin = new Date(nuevaFechaInicio);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 6);

    setForm({
      tipo_contrato: ultimoContratoVencido.tipo_contrato,
      modalidad: ultimoContratoVencido.modalidad || 'PRESENCIAL',
      fecha_inicio: toDateString(nuevaFechaInicio),
      fecha_fin: toDateString(nuevaFechaFin),
      remuneracion: ultimoContratoVencido.remuneracion?.toString() || sueldoBase?.toString() || '',
      cliente_id: clienteIdStr,
      sede_id: resolvedSedeId?.toString() || '',
      lugar_trabajo: ultimoContratoVencido.lugar_trabajo || '',
      observaciones: '',
      plantilla_id: plantillaPredeterminada?.id.toString() || '',
      generar_documento: !!plantillaPredeterminada,
      cargo_id: cargoId?.toString() || '',
      regimen_laboral: ultimoContratoVencido.regimen_laboral || '',
    });
    setShowRenovarModal(true);
  };

  const handleRenovarVencido = async () => {
    if (!ultimoContratoVencido || !form.fecha_inicio) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/contratos/${ultimoContratoVencido.id}/renovar`, {
        empleado_id: empleadoId,
        tipo_contrato: form.tipo_contrato,
        regimen_laboral: form.regimen_laboral || undefined,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : undefined,
        lugar_trabajo: form.lugar_trabajo || undefined,
        observaciones: form.observaciones || undefined,
        plantilla_id: form.plantilla_id ? parseInt(form.plantilla_id) : undefined,
      });
      toast.success('Contrato renovado correctamente');
      setShowRenovarModal(false);

      const clienteSeleccionado = clientes.find(c => c.id.toString() === form.cliente_id);
      if (form.generar_documento && form.plantilla_id) {
        await generarDocumentoParaContrato(
          {
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            fecha_firma: form.fecha_inicio,
            remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
            empresa_cliente: clienteSeleccionado?.razon_social || '',
            lugar_trabajo: form.lugar_trabajo,
            tipo_contrato: form.tipo_contrato,
            modalidad: form.modalidad,
          },
          form.plantilla_id
        );
      }

      fetchContratos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al renovar contrato'));
    } finally {
      setSaving(false);
    }
  };

  const handleReingresoClick = async () => {
    const plantillasActualizadas = await fetchPlantillas();
    const plantillaPredeterminada = plantillasActualizadas.find(
      (p) => p.tipo_contrato === 'SUJETO_A_MODALIDAD' && p.es_predeterminada && p.archivo_base_url
    ) || plantillasActualizadas.find((p) => p.archivo_base_url);

    setForm({
      ...initialFormState,
      remuneracion: sueldoBase?.toString() || '',
      fecha_inicio: toDateString(new Date()),
      plantilla_id: plantillaPredeterminada?.id.toString() || '',
      generar_documento: !!plantillaPredeterminada,
    });
    setSedesFiltradas([]);
    setShowReingresoModal(true);
  };

  const handleReingreso = async () => {
    if (!form.tipo_contrato || !form.fecha_inicio) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      await api.post('/contratos/reingreso', {
        empleado_id: empleadoId,
        tipo_contrato: form.tipo_contrato,
        modalidad: form.modalidad || undefined,
        regimen_laboral: form.regimen_laboral || undefined,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : undefined,
        lugar_trabajo: form.lugar_trabajo || undefined,
        observaciones: form.observaciones || undefined,
        plantilla_id: form.plantilla_id ? parseInt(form.plantilla_id) : undefined,
      });
      toast.success('Reingreso procesado correctamente. Empleado reactivado.');
      setShowReingresoModal(false);

      const clienteSeleccionado = clientes.find(c => c.id.toString() === form.cliente_id);
      if (form.generar_documento && form.plantilla_id) {
        await generarDocumentoParaContrato(
          {
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            fecha_firma: form.fecha_inicio,
            remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
            empresa_cliente: clienteSeleccionado?.razon_social || '',
            lugar_trabajo: form.lugar_trabajo,
            tipo_contrato: form.tipo_contrato,
            modalidad: form.modalidad,
          },
          form.plantilla_id
        );
      }

      fetchContratos();
      onEmpleadoUpdate?.();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al procesar reingreso'));
    } finally {
      setSaving(false);
    }
  };

  const handleRenovarContrato = async () => {
    const contratoARenovar = contratoVigente || ultimoContratoVencido;
    if (!contratoARenovar || !form.fecha_inicio) {
      toast.error('Complete los campos requeridos');
      return;
    }

    if (form.generar_documento && !form.plantilla_id) {
      toast.error('Seleccione una plantilla para generar el documento');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/contratos/${contratoARenovar.id}/renovar`, {
        empleado_id: empleadoId,
        tipo_contrato: form.tipo_contrato,
        regimen_laboral: form.regimen_laboral || undefined,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : undefined,
        lugar_trabajo: form.lugar_trabajo || undefined,
        observaciones: form.observaciones || undefined,
        plantilla_id: form.plantilla_id ? parseInt(form.plantilla_id) : undefined,
        cargo_id: form.cargo_id ? parseInt(form.cargo_id) : undefined,
      });
      toast.success('Contrato renovado correctamente');
      setShowRenovarModal(false);

      const clienteSeleccionado = clientes.find(c => c.id.toString() === form.cliente_id);

      if (form.generar_documento && form.plantilla_id) {
        await generarDocumentoParaContrato(
          {
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            fecha_firma: form.fecha_inicio,
            remuneracion: form.remuneracion ? parseFloat(form.remuneracion) : undefined,
            empresa_cliente: clienteSeleccionado?.razon_social || '',
            lugar_trabajo: form.lugar_trabajo,
            tipo_contrato: form.tipo_contrato,
            modalidad: form.modalidad,
          },
          form.plantilla_id
        );
      }

      fetchContratos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al renovar contrato'));
    } finally {
      setSaving(false);
    }
  };

  const handleSolicitarCese = async () => {
    if (!ceseForm.tipo_cese_id || !ceseForm.fecha_efectiva) {
      toast.error('Complete los campos requeridos');
      return;
    }
    if (ceseFiles.length === 0) {
      toast.error('Adjunte al menos un documento de respaldo');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('empleado_id', String(empleadoId));
      formData.append('tipo_cese_id', ceseForm.tipo_cese_id);
      formData.append('fecha_efectiva', ceseForm.fecha_efectiva);
      if (ceseForm.motivo) {
        formData.append('motivo', ceseForm.motivo);
      }
      for (const f of ceseFiles) {
        formData.append('files', f);
      }
      await api.upload('/solicitudes-cese', formData);
      toast.success('Solicitud de cese creada, pendiente de aprobacion');
      setShowSolicitarCeseModal(false);
      setCeseForm({ tipo_cese_id: '', motivo: '', fecha_efectiva: '' });
      setCeseFiles([]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al crear solicitud de cese'));
    } finally {
      setSaving(false);
    }
  };

  return {
    // Modal states
    showNuevoModal, setShowNuevoModal,
    showRenovarModal, setShowRenovarModal,
    showReingresoModal, setShowReingresoModal,
    showSolicitarCeseModal, setShowSolicitarCeseModal,
    // Form state
    ceseForm, setCeseForm,
    ceseFiles, setCeseFiles,
    // Loading
    saving,
    // Handlers
    handleNuevoContrato,
    handleCrearContrato,
    handleRenovarClick,
    handleRenovarVencidoClick,
    handleRenovarVencido,
    handleReingresoClick,
    handleReingreso,
    handleRenovarContrato,
    handleSolicitarCese,
    // Internal helper (also needed by docs hook)
    generarDocumentoParaContrato,
  };
}
