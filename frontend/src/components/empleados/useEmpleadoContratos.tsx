'use client';

import { useState } from 'react';
import { differenceInDays, differenceInMonths } from 'date-fns';
import { formatDateSafe } from '@/lib/utils';
import { initialFormState, ContratoForm } from './hooks/contratos.types';
import { useContratosData } from './hooks/useContratosData';
import { useContratosCrud } from './hooks/useContratosCrud';
import { useContratosDocumentos } from './hooks/useContratosDocumentos';

export function calcularDuracionVinculo(fechaInicio: string, fechaFin?: string | null): string {
  if (!fechaInicio) return '';
  try {
    const [y1, m1, d1] = fechaInicio.split('T')[0].split('-');
    const inicio = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1));
    const fin = fechaFin
      ? (() => { const [y2, m2, d2] = fechaFin.split('T')[0].split('-'); return new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2)); })()
      : new Date();
    const meses = differenceInMonths(fin, inicio);
    const diasRestantes = differenceInDays(fin, new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate()));
    if (meses >= 12) {
      const anos = Math.floor(meses / 12);
      const mesesResto = meses % 12;
      return mesesResto > 0 ? `${anos}a ${mesesResto}m` : `${anos}a`;
    }
    return diasRestantes > 0 ? `${meses}m ${diasRestantes}d` : `${meses}m`;
  } catch { return ''; }
}

interface UseEmpleadoContratosParams {
  empleadoId: number;
  sueldoBase?: number;
  estadoEmpleado?: string;
  fechaCese?: string;
  clienteId?: number;
  sedeId?: number;
  cargoId?: number;
  onEmpleadoUpdate?: () => void;
}

export function useEmpleadoContratos({
  empleadoId, sueldoBase, estadoEmpleado, fechaCese, clienteId, sedeId, cargoId, onEmpleadoUpdate,
}: UseEmpleadoContratosParams) {
  // Shared form state — lifted here so sub-hooks can share it
  const [form, setForm] = useState<ContratoForm>(initialFormState);

  // --- Sub-hooks ---
  const data = useContratosData({ empleadoId, form, setForm });

  const crud = useContratosCrud({
    empleadoId,
    sueldoBase,
    clienteId,
    sedeId,
    cargoId,
    onEmpleadoUpdate,
    contratos: data.contratos,
    clientes: data.clientes,
    fetchContratos: data.fetchContratos,
    fetchPlantillas: data.fetchPlantillas,
    fetchSedes: data.fetchSedes,
    setSedesFiltradas: data.setSedesFiltradas,
    form,
    setForm,
  });

  const docs = useContratosDocumentos({
    empleadoId,
    plantillas: data.plantillas,
    plantillasBanco: data.plantillasBanco,
    fetchPlantillas: data.fetchPlantillas,
  });

  // --- Derived values ---
  const contratoVigente = data.contratos.find((c) => c.estado === 'ACTIVO');
  const ultimoContratoVencido = data.contratos.find((c) => c.estado === 'PENDIENTE');
  const esCesado = estadoEmpleado === 'CESADO';
  const historial = data.contratos.filter((c) => c.estado !== 'ACTIVO');

  const getDiasParaVencer = (fechaFin: string | undefined) => {
    if (!fechaFin) return null;
    try {
      const [y, m, d] = fechaFin.split('T')[0].split('-');
      const fechaLocal = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return differenceInDays(fechaLocal, hoy);
    } catch {
      return null;
    }
  };

  const diasParaVencer = contratoVigente?.fecha_fin
    ? getDiasParaVencer(contratoVigente.fecha_fin)
    : null;
  const proximoAVencer = diasParaVencer !== null && diasParaVencer <= 30 && diasParaVencer >= 0;

  const formatDate = (dateString: string | undefined) => formatDateSafe(dateString);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  };

  return {
    // Data
    contratos: data.contratos,
    loading: data.loading,
    plantillas: data.plantillas,
    clientes: data.clientes,
    sedes: data.sedes,
    sedesFiltradas: data.sedesFiltradas,
    plantillasBanco: data.plantillasBanco,
    cargos: data.cargos,
    tiposCese: data.tiposCese,
    // Modals
    showNuevoModal: crud.showNuevoModal,
    setShowNuevoModal: crud.setShowNuevoModal,
    showRenovarModal: crud.showRenovarModal,
    setShowRenovarModal: crud.setShowRenovarModal,
    showReingresoModal: crud.showReingresoModal,
    setShowReingresoModal: crud.setShowReingresoModal,
    showSolicitarCeseModal: crud.showSolicitarCeseModal,
    setShowSolicitarCeseModal: crud.setShowSolicitarCeseModal,
    showDetalleModal: docs.showDetalleModal,
    setShowDetalleModal: docs.setShowDetalleModal,
    showGenerarBancoModal: docs.showGenerarBancoModal,
    setShowGenerarBancoModal: docs.setShowGenerarBancoModal,
    // Form
    form, setForm, initialFormState,
    selectedContrato: docs.selectedContrato,
    setSelectedContrato: docs.setSelectedContrato,
    selectedPlantilla: docs.selectedPlantilla,
    setSelectedPlantilla: docs.setSelectedPlantilla,
    selectedPlantillaBanco: docs.selectedPlantillaBanco,
    setSelectedPlantillaBanco: docs.setSelectedPlantillaBanco,
    activeTab: docs.activeTab,
    setActiveTab: docs.setActiveTab,
    ceseForm: crud.ceseForm,
    setCeseForm: crud.setCeseForm,
    ceseFiles: crud.ceseFiles,
    setCeseFiles: crud.setCeseFiles,
    // Loading states
    saving: crud.saving,
    generating: docs.generating,
    downloadingContratoId: docs.downloadingContratoId,
    // Computed
    contratoVigente, ultimoContratoVencido, esCesado, historial,
    expandedVinculos: data.expandedVinculos,
    vinculosAgrupados: data.vinculosAgrupados,
    diasParaVencer, proximoAVencer,
    // Handlers
    toggleVinculo: data.toggleVinculo,
    fetchContratos: data.fetchContratos,
    handleClienteChange: data.handleClienteChange,
    handleSedeChange: data.handleSedeChange,
    formatDate, formatCurrency, getDiasParaVencer,
    handleNuevoContrato: crud.handleNuevoContrato,
    generarDocumentoParaContrato: crud.generarDocumentoParaContrato,
    handleDescargarContrato: docs.handleDescargarContrato,
    handleCrearContrato: crud.handleCrearContrato,
    handleRenovarClick: crud.handleRenovarClick,
    handleRenovarVencidoClick: crud.handleRenovarVencidoClick,
    handleRenovarVencido: crud.handleRenovarVencido,
    handleReingresoClick: crud.handleReingresoClick,
    handleReingreso: crud.handleReingreso,
    handleRenovarContrato: crud.handleRenovarContrato,
    handleSolicitarCese: crud.handleSolicitarCese,
    handleGenerarUnificado: docs.handleGenerarUnificado,
    handleVerDetalle: docs.handleVerDetalle,
    handleGenerarDocClick: docs.handleGenerarDocClick,
    calcularDuracionVinculo,
  };
}
