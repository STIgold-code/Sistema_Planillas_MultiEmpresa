'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import { EmpleadoContratos } from '@/components/empleados/EmpleadoContratos';
import { EmpleadoCeses } from '@/components/empleados/EmpleadoCeses';
import { TabsContent } from '@/components/ui/tabs';
import {
  Briefcase,
  CreditCard,
  FileText,
  History,
  Loader2,
  ScrollText,
  User,
  UserX,
  Users,
} from 'lucide-react';
import { useEmpleadoDetalle } from './hooks/useEmpleadoDetalle';
import { EmpleadoHeader } from './components/EmpleadoHeader';
import { TabPersonal } from './components/TabPersonal';
import { TabLaboral } from './components/TabLaboral';
import { TabBancario } from './components/TabBancario';
import { TabFamiliares } from './components/TabFamiliares';
import { TabDocumentos } from './components/TabDocumentos';
import { TabMovimientos } from './components/TabMovimientos';

export default function EmpleadoDetailPage() {
  const state = useEmpleadoDetalle();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!state.empleado) return null;

  const { empleado } = state;
  const nombreCompleto = `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;

  return (
    <div className="space-y-4 md:space-y-6">
      <EmpleadoHeader
        empleado={empleado}
        fotoUrl={state.fotoUrl}
        nombreCompleto={nombreCompleto}
      />

      <Tabs defaultValue="personal" className="space-y-4">
        {/* Tab list — horizontal scroll on mobile */}
        <div className="max-w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-max h-auto p-1 gap-1">
            <TabsTrigger value="personal" className="flex-none gap-1 text-xs px-2 py-1.5">
              <User className="h-3.5 w-3.5" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="laboral" className="flex-none gap-1 text-xs px-2 py-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Laboral
            </TabsTrigger>
            <TabsTrigger value="bancario" className="flex-none gap-1 text-xs px-2 py-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Bancario
            </TabsTrigger>
            <TabsTrigger value="familiares" className="flex-none gap-1 text-xs px-2 py-1.5">
              <Users className="h-3.5 w-3.5" />
              Familia
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex-none gap-1 text-xs px-2 py-1.5">
              <FileText className="h-3.5 w-3.5" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="contratos" className="flex-none gap-1 text-xs px-2 py-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="ceses" className="flex-none gap-1 text-xs px-2 py-1.5">
              <UserX className="h-3.5 w-3.5" />
              Ceses
            </TabsTrigger>
            <TabsTrigger value="movimientos" className="flex-none gap-1 text-xs px-2 py-1.5">
              <History className="h-3.5 w-3.5" />
              Movim.
            </TabsTrigger>
          </TabsList>
        </div>

        <TabPersonal empleado={empleado} formatDate={state.formatDate} />

        <TabLaboral empleado={empleado} formatDate={state.formatDate} formatCurrency={state.formatCurrency} />

        <TabBancario empleado={empleado} />

        <TabFamiliares
          empleado={empleado}
          formatDate={state.formatDate}
          familiarDialogOpen={state.familiarDialogOpen}
          setFamiliarDialogOpen={state.setFamiliarDialogOpen}
          familiarForm={state.familiarForm}
          savingFamiliar={state.savingFamiliar}
          deletingFamiliarId={state.deletingFamiliarId}
          handleOpenFamiliarDialog={state.handleOpenFamiliarDialog}
          handleSaveFamiliar={state.handleSaveFamiliar}
          handleDeleteFamiliar={state.handleDeleteFamiliar}
        />

        <TabDocumentos
          empleado={empleado}
          formatDate={state.formatDate}
          tiposDocumento={state.tiposDocumento}
          tipoFiltro={state.tipoFiltro}
          setTipoFiltro={state.setTipoFiltro}
          docsSeleccion={state.docsSeleccion}
          docsRRHH={state.docsRRHH}
          docsSeleccionFiltrados={state.docsSeleccionFiltrados}
          docsRRHHFiltrados={state.docsRRHHFiltrados}
          categoriasSeleccion={state.categoriasSeleccion}
          categoriasRRHH={state.categoriasRRHH}
          canEditSeleccionDocs={state.canEditSeleccionDocs}
          deletingDocId={state.deletingDocId}
          handleVerDocumento={state.handleVerDocumento}
          handleDescargarDocumento={state.handleDescargarDocumento}
          handleDeleteDocumento={state.handleDeleteDocumento}
          documentoDialogOpen={state.documentoDialogOpen}
          setDocumentoDialogOpen={state.setDocumentoDialogOpen}
          documentoForm={state.documentoForm}
          savingDocumento={state.savingDocumento}
          selectedFile={state.selectedFile}
          setSelectedFile={state.setSelectedFile}
          handleOpenDocumentoDialog={state.handleOpenDocumentoDialog}
          handleSaveDocumento={state.handleSaveDocumento}
        />

        <TabsContent value="contratos">
          <EmpleadoContratos
            empleadoId={empleado.id}
            sueldoBase={empleado.sueldo_base}
            estadoEmpleado={empleado.estado}
            fechaCese={empleado.fecha_cese}
            clienteId={empleado.sede?.cliente_id}
            sedeId={empleado.sede_id}
            cargoId={empleado.cargo_id}
            onEmpleadoUpdate={state.fetchEmpleado}
          />
        </TabsContent>

        <TabsContent value="ceses">
          <EmpleadoCeses empleadoId={empleado.id} />
        </TabsContent>

        <TabMovimientos
          empleado={empleado}
          formatDate={state.formatDate}
          movimientoDialogOpen={state.movimientoDialogOpen}
          setMovimientoDialogOpen={state.setMovimientoDialogOpen}
          movimientoForm={state.movimientoForm}
          savingMovimiento={state.savingMovimiento}
          handleOpenMovimientoDialog={state.handleOpenMovimientoDialog}
          handleSaveMovimiento={state.handleSaveMovimiento}
        />
      </Tabs>

      {/* Modal Vista Previa Documentos */}
      <FilePreviewModal
        open={state.previewDocIndex >= 0}
        onOpenChange={(open) => { if (!open) state.setPreviewDocIndex(-1); }}
        files={[...state.docsSeleccion, ...state.docsRRHH].map(d => ({
          id: d.id,
          archivo_url: d.archivo_url,
          archivo_nombre: d.archivo_nombre || 'documento',
        }))}
        initialIndex={state.previewDocIndex >= 0 ? state.previewDocIndex : 0}
      />
    </div>
  );
}
