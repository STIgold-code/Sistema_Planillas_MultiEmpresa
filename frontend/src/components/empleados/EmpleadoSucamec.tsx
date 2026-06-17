'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, IdCard } from 'lucide-react';
import { useEmpleadoSucamec } from './hooks/useEmpleadoSucamec';
import { SucamecAlertaVencimiento } from './sucamec/SucamecAlertaVencimiento';
import { SucamecCarnetVigente } from './sucamec/SucamecCarnetVigente';
import { SucamecHistorial } from './sucamec/SucamecHistorial';
import {
  CarnetFormDialog,
  VincularDocumentoDialog,
  DetalleCarnetDialog,
  MotivoAlertDialog,
} from './sucamec/SucamecDialogs';

interface EmpleadoSucamecProps {
  empleadoId: number;
  estadoEmpleado?: string;
  onUpdate?: () => void;
}

export default function EmpleadoSucamec({ empleadoId, estadoEmpleado, onUpdate }: EmpleadoSucamecProps) {
  const {
    loading, saving, form, setForm, selectedCarnet, motivo, setMotivo,
    selectedDocumentoId, setSelectedDocumentoId, carnetFile, setCarnetFile,
    documentosSinVincular, carnetVigente, historial, proximoAVencer, yaVencido,
    showNuevoModal, setShowNuevoModal,
    showRenovarModal, setShowRenovarModal,
    showDetalleModal, setShowDetalleModal,
    showSuspenderModal, setShowSuspenderModal,
    showAnularModal, setShowAnularModal,
    showVincularModal, setShowVincularModal,
    getDiasParaVencer, getCategoriaLabel,
    handleNuevo, handleRenovar, handleVerDetalle, handleSuspender, handleAnular,
    handleVincular, handleCrear, handleRenovarSubmit, handleSuspenderSubmit,
    handleAnularSubmit, handleReactivar, handleVincularSubmit, handleDesvincular,
  } = useEmpleadoSucamec(empleadoId, onUpdate);

  const esCesado = estadoEmpleado === 'CESADO';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {carnetVigente && (proximoAVencer || yaVencido) && (
        <SucamecAlertaVencimiento
          carnetVigente={carnetVigente}
          yaVencido={yaVencido}
          getDiasParaVencer={getDiasParaVencer}
          onRenovar={handleRenovar}
        />
      )}

      {carnetVigente ? (
        <SucamecCarnetVigente
          carnet={carnetVigente}
          proximoAVencer={proximoAVencer}
          yaVencido={yaVencido}
          getDiasParaVencer={getDiasParaVencer}
          getCategoriaLabel={getCategoriaLabel}
          onVerDetalle={handleVerDetalle}
          onRenovar={handleRenovar}
          onSuspender={handleSuspender}
          onAnular={handleAnular}
          onVincular={handleVincular}
          onDesvincular={handleDesvincular}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IdCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">Sin carnet SUCAMEC vigente</p>
            <p className="text-sm text-muted-foreground mb-4">
              {esCesado ? 'El empleado esta dado de baja' : 'Registre un carnet SUCAMEC para este empleado'}
            </p>
            {!esCesado && (
              <Button onClick={handleNuevo}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Carnet
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {carnetVigente && !esCesado && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleNuevo}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Carnet (otra categoria)
          </Button>
        </div>
      )}

      <SucamecHistorial
        historial={historial}
        getCategoriaLabel={getCategoriaLabel}
        onVerDetalle={handleVerDetalle}
        onReactivar={handleReactivar}
      />

      <CarnetFormDialog
        open={showNuevoModal}
        onOpenChange={setShowNuevoModal}
        title="Nuevo Carnet SUCAMEC"
        description="Registre un nuevo carnet SUCAMEC para el empleado"
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={handleCrear}
        documentosSinVincular={documentosSinVincular}
        carnetFile={carnetFile}
        setCarnetFile={setCarnetFile}
        submitLabel="Guardar"
      />

      <CarnetFormDialog
        open={showRenovarModal}
        onOpenChange={setShowRenovarModal}
        title="Renovar Carnet SUCAMEC"
        description={`El carnet actual ${selectedCarnet?.numero_carnet} sera marcado como vencido`}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={handleRenovarSubmit}
        documentosSinVincular={documentosSinVincular}
        submitLabel="Renovar"
        numeroLabel="Nuevo Numero de Carnet *"
      />

      <VincularDocumentoDialog
        open={showVincularModal}
        onOpenChange={setShowVincularModal}
        selectedCarnet={selectedCarnet}
        documentosSinVincular={documentosSinVincular}
        selectedDocumentoId={selectedDocumentoId}
        setSelectedDocumentoId={setSelectedDocumentoId}
        saving={saving}
        onSubmit={handleVincularSubmit}
      />

      <DetalleCarnetDialog
        open={showDetalleModal}
        onOpenChange={setShowDetalleModal}
        carnet={selectedCarnet}
        getCategoriaLabel={getCategoriaLabel}
      />

      <MotivoAlertDialog
        open={showSuspenderModal}
        onOpenChange={setShowSuspenderModal}
        title="Suspender Carnet SUCAMEC"
        description="Esta accion suspendera temporalmente el carnet. El empleado no podra operar hasta que se reactive."
        motivoLabel="Motivo de Suspension *"
        motivoPlaceholder="Ingrese el motivo de la suspension..."
        motivo={motivo}
        setMotivo={setMotivo}
        saving={saving}
        onConfirm={handleSuspenderSubmit}
        confirmLabel="Suspender"
        confirmClassName="bg-yellow-600 hover:bg-yellow-700"
      />

      <MotivoAlertDialog
        open={showAnularModal}
        onOpenChange={setShowAnularModal}
        title="Anular Carnet SUCAMEC"
        description="Esta accion es permanente. El carnet quedara anulado y no podra reactivarse."
        motivoLabel="Motivo de Anulacion *"
        motivoPlaceholder="Ingrese el motivo de la anulacion..."
        motivo={motivo}
        setMotivo={setMotivo}
        saving={saving}
        onConfirm={handleAnularSubmit}
        confirmLabel="Anular"
        confirmClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
