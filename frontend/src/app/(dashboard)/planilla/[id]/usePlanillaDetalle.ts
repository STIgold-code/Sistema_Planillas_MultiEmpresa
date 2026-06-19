'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, getAccessToken } from '@/lib/api';
import { Planilla, PlanillaDetalle } from '@/types';
import { toast } from 'sonner';
import { EditForm, ConfirmAction } from './types';
import { exportarPlanillaExcel } from './planilla-export';
import {
  detectarBloqueoCertificacion,
  type BloqueoCertificacion,
} from '@/lib/error-certificacion';

const DEFAULT_EDIT_FORM: EditForm = {
  horas_extras_25: 0,
  horas_extras_35: 0,
  pasaje_especial: 0,
  bonificaciones: 0,
  otros_ingresos: 0,
  compensacion_vacacional: 0,
  pegada_reenganche: 0,
  bono_referido: 0,
  reintegro_dias_trab: 0,
  reintegro_inafecto: 0,
  ingreso_sobregiro: 0,
  venta_vacaciones: 0,
  adelanto_quincena: 0,
  adelanto_vacacional: 0,
  otros_adelantos: 0,
  adelanto_cts: 0,
  adelanto_gratificacion: 0,
  otros_descuentos: 0,
  descuento_sobregiro: 0,
  descuento_reintegro: 0,
  prestamo: 0,
  retencion_judicial: 0,
  renta_5ta: 0,
  observaciones: '',
};

export function usePlanillaDetalle() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const [editingDetalle, setEditingDetalle] = useState<PlanillaDetalle | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(DEFAULT_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [downloadingBoletas, setDownloadingBoletas] = useState(false);
  const [bloqueoCertificacion, setBloqueoCertificacion] =
    useState<BloqueoCertificacion | null>(null);

  const fetchPlanilla = async () => {
    setLoading(true);
    try {
      const data = await api.get<Planilla>(`/planillas/${id}`);
      setPlanilla(data);
    } catch (error) {
      console.error('Error fetching planilla:', error);
      toast.error('Error al cargar la planilla');
      router.push('/planilla');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlanilla();
    }
  }, [id]);

  const handleCalcular = async () => {
    setCalculating(true);
    try {
      await api.post(`/planillas/${id}/calcular`, {});
      toast.success('Planilla calculada correctamente');
      fetchPlanilla();
    } catch (error: unknown) {
      const bloqueo = detectarBloqueoCertificacion(error);
      if (bloqueo) {
        setBloqueoCertificacion(bloqueo);
      } else {
        const mensaje =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message?: unknown }).message)
            : '';
        toast.error(mensaje || 'Error al calcular la planilla');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleAprobar = async () => {
    setApproving(true);
    try {
      await api.post(`/planillas/${id}/aprobar`, {});
      toast.success('Planilla aprobada correctamente');
      fetchPlanilla();
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar la planilla');
    } finally {
      setApproving(false);
      setConfirmAction(null);
    }
  };

  const handlePagar = async () => {
    setPaying(true);
    try {
      await api.post(`/planillas/${id}/pagar`, {});
      toast.success('Planilla marcada como pagada');
      fetchPlanilla();
    } catch (error: any) {
      toast.error(error.message || 'Error al marcar como pagada');
    } finally {
      setPaying(false);
      setConfirmAction(null);
    }
  };

  const handleAnular = async () => {
    setCanceling(true);
    try {
      await api.post(`/planillas/${id}/anular`, {});
      toast.success('Planilla anulada');
      fetchPlanilla();
    } catch (error: any) {
      toast.error(error.message || 'Error al anular la planilla');
    } finally {
      setCanceling(false);
      setConfirmAction(null);
    }
  };

  const handleDescargarBoletas = async () => {
    setDownloadingBoletas(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boletas/planilla/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al descargar boletas');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const boletasCount = response.headers.get('X-Boletas-Count');
      let filename = 'boletas.pdf';
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

      toast.success(`PDF descargado con ${boletasCount || 'todas las'} boletas`);
    } catch (error: any) {
      console.error('Error downloading boletas:', error);
      toast.error(error.message || 'Error al descargar las boletas');
    } finally {
      setDownloadingBoletas(false);
    }
  };

  const openEditModal = (detalle: PlanillaDetalle) => {
    setEditingDetalle(detalle);
    setEditForm({
      horas_extras_25: Number(detalle.horas_extras_25) || 0,
      horas_extras_35: Number(detalle.horas_extras_35) || 0,
      pasaje_especial: Number(detalle.pasaje_especial) || 0,
      bonificaciones: Number(detalle.bonificaciones) || 0,
      otros_ingresos: Number(detalle.otros_ingresos) || 0,
      compensacion_vacacional: Number(detalle.compensacion_vacacional) || 0,
      pegada_reenganche: Number(detalle.pegada_reenganche) || 0,
      bono_referido: Number(detalle.bono_referido) || 0,
      reintegro_dias_trab: Number(detalle.reintegro_dias_trab) || 0,
      reintegro_inafecto: Number(detalle.reintegro_inafecto) || 0,
      ingreso_sobregiro: Number(detalle.ingreso_sobregiro) || 0,
      venta_vacaciones: Number(detalle.venta_vacaciones) || 0,
      adelanto_quincena: Number(detalle.adelanto_quincena) || 0,
      adelanto_vacacional: Number(detalle.adelanto_vacacional) || 0,
      otros_adelantos: Number(detalle.otros_adelantos) || 0,
      adelanto_cts: Number(detalle.adelanto_cts) || 0,
      adelanto_gratificacion: Number(detalle.adelanto_gratificacion) || 0,
      otros_descuentos: Number(detalle.otros_descuentos) || 0,
      descuento_sobregiro: Number(detalle.descuento_sobregiro) || 0,
      descuento_reintegro: Number(detalle.descuento_reintegro) || 0,
      prestamo: Number(detalle.prestamo) || 0,
      retencion_judicial: Number(detalle.retencion_judicial) || 0,
      renta_5ta: Number(detalle.renta_5ta) || 0,
      observaciones: detalle.observaciones || '',
    });
  };

  const handleSaveDetalle = async () => {
    if (!editingDetalle) return;
    setSaving(true);
    try {
      await api.patch(`/planillas/${id}/detalle/${editingDetalle.id}`, editForm);
      toast.success('Detalle actualizado');
      setEditingDetalle(null);
      fetchPlanilla();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleExportar = async () => exportarPlanillaExcel(id);

  const formatCurrency = (value: number) => {
    return `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  const getNombreCompleto = (empleado: PlanillaDetalle['empleado']) => {
    if (!empleado) return '-';
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
  };

  const canEdit = planilla?.estado === 'CALCULADA' || planilla?.estado === 'REVISADA';
  const canCalculate = planilla?.estado === 'BORRADOR' || planilla?.estado === 'CALCULADA';
  const canApprove = planilla?.estado === 'CALCULADA' || planilla?.estado === 'REVISADA';
  const canPay = planilla?.estado === 'APROBADA';
  const canCancel = planilla?.estado !== 'PAGADA' && planilla?.estado !== 'ANULADA';

  return {
    planilla,
    loading,
    calculating,
    approving,
    paying,
    canceling,
    editingDetalle,
    setEditingDetalle,
    editForm,
    setEditForm,
    saving,
    confirmAction,
    setConfirmAction,
    downloadingBoletas,
    bloqueoCertificacion,
    setBloqueoCertificacion,
    handleCalcular,
    handleAprobar,
    handlePagar,
    handleAnular,
    handleDescargarBoletas,
    openEditModal,
    handleSaveDetalle,
    handleExportar,
    formatCurrency,
    getNombreCompleto,
    canEdit,
    canCalculate,
    canApprove,
    canPay,
    canCancel,
  };
}
