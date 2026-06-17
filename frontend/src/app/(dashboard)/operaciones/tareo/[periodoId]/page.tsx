'use client';

import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { JustificacionModal } from '@/components/tareo/JustificacionModal';
import { JustificacionesDrawer } from '@/components/tareo/JustificacionesDrawer';
import { EstadoSesionBanner, SolicitudesExtensionPanel, AlertasFaltasPanel } from '@/components/tareo';
import { TareoLeyenda } from '@/components/tareo/TareoLeyenda';
import TareoMobileView from './TareoMobileView';

import { useTareoDetalle } from './useTareoDetalle';
import { TareoHeader } from './components/TareoHeader';
import { TareoFilters } from './components/TareoFilters';
import { ResumenPeriodo } from './components/ResumenPeriodo';
import { TareoGrilla } from './components/TareoGrilla';
import { HistorialDialog } from './components/HistorialDialog';
import { ImportDialog } from './components/ImportDialog';
import { RangoMarcacionDialog } from './components/RangoMarcacionDialog';

export default function TareoGrillaPage() {
  const s = useTareoDetalle();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!s.data) {
    return (
      <div className="text-center py-8 text-xs md:text-sm text-muted-foreground">
        No se encontró el periodo
      </div>
    );
  }

  const { data } = s;
  const diasArray = Array.from({ length: data.periodo.dias_mes }, (_, i) => i + 1);
  const diasFiltrados = diasArray.filter(dia => {
    if (s.filterDiaDesde !== null && dia < s.filterDiaDesde) return false;
    if (s.filterDiaHasta !== null && dia > s.filterDiaHasta) return false;
    return true;
  });

  const periodoActivo = data.periodo.estado !== 'CERRADO' && data.periodo.estado !== 'ANULADO';

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <TareoHeader
          data={data}
          cambiosPendientes={s.cambiosPendientes}
          saving={s.saving}
          sincronizando={s.sincronizando}
          sesionTareo={s.sesionTareo}
          onBack={() => s.router.push('/operaciones/tareo')}
          onGuardar={s.handleGuardar}
          onExportar={s.handleExportar}
          onImportar={() => s.setImportDialogOpen(true)}
          onSincronizar={s.handleSincronizarEmpleados}
        />

        {periodoActivo && (
          <EstadoSesionBanner
            sesion={s.sesionTareo.sesion}
            esAdmin={s.sesionTareo.esAdmin}
            esCorrector={s.sesionTareo.esCorrector}
            requiereSesion={s.sesionTareo.requiereSesion}
            tiempoRestante={s.sesionTareo.tiempoRestante}
            tiempoFormateado={s.sesionTareo.tiempoFormateado}
            cargando={s.sesionTareo.cargando}
            error={s.sesionTareo.error}
            puedeIniciarSesion={s.sesionTareo.puedeIniciarSesion}
            motivoNoInicio={s.sesionTareo.motivoNoInicio}
            solicitudPendiente={s.sesionTareo.solicitudPendiente}
            tiempoLimite={s.sesionTareo.configuracion?.tiempo_limite_minutos || 60}
            onIniciarSesion={s.sesionTareo.iniciarSesion}
            onFinalizarSesion={s.sesionTareo.finalizarSesion}
            onSolicitarExtension={s.sesionTareo.solicitarExtension}
          />
        )}

        {(s.sesionTareo.esAdmin || s.sesionTareo.esCorrector) && periodoActivo && (
          <SolicitudesExtensionPanel
            periodoId={s.periodoId}
            onSolicitudResuelta={s.sesionTareo.refrescar}
          />
        )}

        <AlertasFaltasPanel periodoId={s.periodoId} mes={data.periodo.mes} anio={data.periodo.anio} />

        {s.isMobileView && (
          <div className="lg:hidden">
            <TareoMobileView
              data={data}
              cambiosPendientes={s.cambiosPendientes}
              onSelectMarcacion={s.handleSelectMarcacion}
              onApplyRange={s.handleApplyRangeFromMobile}
              searchTerm={s.searchTerm}
              onSearchChange={s.setSearchTerm}
              filterAreaId={s.filterAreaId}
              onFilterAreaChange={s.handleFilterAreaChange}
              filterSedeId={s.filterSedeId}
              onFilterSedeChange={s.handleFilterSedeChange}
              currentPage={s.currentPage}
              onPageChange={s.setCurrentPage}
            />
          </div>
        )}

        <div className={`hidden${!s.isMobileView ? ' lg:block md:block' : ''}`}>
          <TareoFilters
            data={data}
            loading={s.loading}
            searchTerm={s.searchTerm}
            filterAreaId={s.filterAreaId}
            filterSedeId={s.filterSedeId}
            filterDiaDesde={s.filterDiaDesde}
            filterDiaHasta={s.filterDiaHasta}
            currentPage={s.currentPage}
            filtersOpen={s.filtersOpen}
            onSearchChange={s.setSearchTerm}
            onFilterAreaChange={s.handleFilterAreaChange}
            onFilterSedeChange={s.handleFilterSedeChange}
            onFilterDiaDesdeChange={s.setFilterDiaDesde}
            onFilterDiaHastaChange={s.setFilterDiaHasta}
            onLimpiarFiltroFechas={s.handleLimpiarFiltroFechas}
            onPageChange={s.setCurrentPage}
            onFiltersOpenChange={s.setFiltersOpen}
          />

          <TareoLeyenda tiposMarcacion={data.tipos_marcacion} className="mb-4" defaultOpen={false} />

          {data.resumen_periodo && <ResumenPeriodo resumen={data.resumen_periodo} />}

          <TareoGrilla
            data={data}
            diasFiltrados={diasFiltrados}
            empleadosFiltrados={s.empleadosFiltrados}
            cambiosPendientes={s.cambiosPendientes}
            celdaActiva={s.celdaActiva}
            rangoInicio={s.rangoInicio}
            rangoSeleccionado={s.rangoSeleccionado}
            diasConJustificacion={s.diasConJustificacion}
            parentRef={s.parentRef}
            onCeldaClick={s.handleCeldaClick}
            onColumnHeaderClick={s.handleColumnHeaderClick}
            onCeldaActiveClose={() => s.setCeldaActiva(null)}
            onSelectMarcacion={s.handleSelectMarcacion}
            onOpenJustificacion={(tareoId, empleadoId, nombre, dia) =>
              s.setJustificacionModal({ open: true, tareoId, empleadoId, empleadoNombre: nombre, diaInicial: dia, diaFinal: dia })
            }
            onOpenHistorialDrawer={(empleadoId, nombre, tareoId) =>
              s.setHistorialDrawer({ open: true, empleadoId, empleadoNombre: nombre, tareoId })
            }
            onVerHistorial={s.handleVerHistorial}
          />

          {s.rangoInicio && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50 max-w-[90vw]">
              <span className="text-sm">
                Celda seleccionada (Día {s.rangoInicio.dia}) -{' '}
                <span className="hidden sm:inline">Shift+Click en otra celda para seleccionar rectángulo</span>
              </span>
              <button
                onClick={s.cancelarRango}
                className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="hidden lg:block text-xs md:text-sm text-muted-foreground space-y-1 mt-4">
            <p>• <strong>Click en celda</strong> para iniciar selección</p>
            <p>• <strong>Shift+Click en otra celda</strong> para seleccionar rectángulo (múltiples empleados × días)</p>
            <p>• <strong>Click en número de día</strong> (cabecera) para seleccionar toda la columna</p>
            <p>• <strong>Doble click</strong> en misma celda para edición individual</p>
            <p>• <strong>Click derecho</strong> en celda para ver historial de cambios</p>
            <p>• Los cambios se marcan en amarillo hasta guardar</p>
            <p className="flex items-center gap-2">
              • Celdas rayadas
              <span
                className="inline-block w-6 h-4 rounded"
                style={{ background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 2px, #e5e7eb 2px, #e5e7eb 4px)' }}
              />
              = días fuera del período de contrato (no editables)
            </p>
          </div>
        </div>

        <RangoMarcacionDialog
          open={s.showRangoPopup}
          rangoSeleccionado={s.rangoSeleccionado}
          tiposMarcacion={data.tipos_marcacion}
          onAplicar={s.aplicarMarcacionRango}
          onCancelar={s.cancelarRango}
        />

        <HistorialDialog
          open={s.historialDialog.open}
          loading={s.loadingHistorial}
          historial={s.historial}
          onClose={() => s.setHistorialDialog({ open: false, detalleId: null })}
        />

        <ImportDialog
          open={s.importDialogOpen}
          importFile={s.importFile}
          importPreview={s.importPreview}
          importLoading={s.importLoading}
          applying={s.applying}
          onClose={s.closeImportDialog}
          onFileSelect={s.handleFileSelect}
          onAplicar={s.handleAplicarImportacion}
          onDescargarErrores={s.handleDescargarErrores}
        />

        {s.justificacionModal && (
          <JustificacionModal
            open={s.justificacionModal.open}
            onOpenChange={(open) => !open && s.setJustificacionModal(null)}
            tareoId={s.justificacionModal.tareoId}
            empleadoNombre={s.justificacionModal.empleadoNombre}
            mes={data.periodo.mes}
            anio={data.periodo.anio}
            diasDelMes={data.periodo.dias_mes}
            diaInicial={s.justificacionModal.diaInicial}
            diaFinal={s.justificacionModal.diaFinal}
            justificacionExistente={s.justificacionModal.justificacionExistente}
            onSuccess={() => s.fetchDiasConJustificacion()}
          />
        )}

        {s.historialDrawer && (
          <JustificacionesDrawer
            open={s.historialDrawer.open}
            onOpenChange={(open) => !open && s.setHistorialDrawer(null)}
            empleadoId={s.historialDrawer.empleadoId}
            empleadoNombre={s.historialDrawer.empleadoNombre}
            tareoId={s.historialDrawer.tareoId}
            periodoInfo={{ mes: data.periodo.mes, anio: data.periodo.anio }}
            onNuevaJustificacion={() =>
              s.setJustificacionModal({
                open: true,
                tareoId: s.historialDrawer!.tareoId,
                empleadoId: s.historialDrawer!.empleadoId,
                empleadoNombre: s.historialDrawer!.empleadoNombre,
              })
            }
            onEditarJustificacion={(justificacion) =>
              s.setJustificacionModal({
                open: true,
                tareoId: s.historialDrawer!.tareoId,
                empleadoId: s.historialDrawer!.empleadoId,
                empleadoNombre: s.historialDrawer!.empleadoNombre,
                justificacionExistente: justificacion,
              })
            }
            onJustificacionDeleted={() => s.fetchDiasConJustificacion()}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
