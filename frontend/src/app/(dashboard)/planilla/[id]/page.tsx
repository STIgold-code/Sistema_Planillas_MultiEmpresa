'use client';

import { Loader2 } from 'lucide-react';
import { usePlanillaDetalle } from './usePlanillaDetalle';
import { PlanillaHeader } from './components/PlanillaHeader';
import { PlanillaResumen } from './components/PlanillaResumen';
import { PlanillaTabla } from './components/PlanillaTabla';
import { EditDetalleDialog } from './components/EditDetalleDialog';
import { ConfirmActionDialog } from './components/ConfirmActionDialog';
import { PlanillaRegimenResumen } from './components/PlanillaRegimenResumen';
import { BloqueoCertificacionDialog } from './components/BloqueoCertificacionDialog';

export default function PlanillaDetallePage() {
  const {
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
  } = usePlanillaDetalle();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!planilla) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      <PlanillaHeader
        planilla={planilla}
        calculating={calculating}
        approving={approving}
        paying={paying}
        canceling={canceling}
        downloadingBoletas={downloadingBoletas}
        canCalculate={canCalculate ?? false}
        canApprove={canApprove ?? false}
        canPay={canPay ?? false}
        canCancel={canCancel ?? false}
        onCalcular={handleCalcular}
        onExportar={handleExportar}
        onDescargarBoletas={handleDescargarBoletas}
        onSetConfirmAction={setConfirmAction}
      />

      <PlanillaResumen planilla={planilla} formatCurrency={formatCurrency} />

      <PlanillaRegimenResumen detalles={planilla.detalles ?? []} />

      <PlanillaTabla
        planilla={planilla}
        canEdit={canEdit ?? false}
        getNombreCompleto={getNombreCompleto}
        onOpenEditModal={openEditModal}
      />

      <EditDetalleDialog
        editingDetalle={editingDetalle}
        editForm={editForm}
        saving={saving}
        getNombreCompleto={getNombreCompleto}
        onClose={() => setEditingDetalle(null)}
        onSave={handleSaveDetalle}
        onChange={setEditForm}
      />

      <ConfirmActionDialog
        confirmAction={confirmAction}
        approving={approving}
        paying={paying}
        canceling={canceling}
        onClose={() => setConfirmAction(null)}
        onAprobar={handleAprobar}
        onPagar={handlePagar}
        onAnular={handleAnular}
      />

      <BloqueoCertificacionDialog
        bloqueo={bloqueoCertificacion}
        onClose={() => setBloqueoCertificacion(null)}
      />
    </div>
  );
}
