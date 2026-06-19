'use client';

import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { features } from '@/lib/features';
import { useSucamec } from './hooks/useSucamec';
import { SucamecResumenCards } from './components/SucamecResumenCards';
import { SucamecFiltros } from './components/SucamecFiltros';
import { SucamecTabla } from './components/SucamecTabla';
import { NuevoCarnetDialog } from './components/NuevoCarnetDialog';

// Guarda de ruta: con SUCAMEC oculto (NEXT_PUBLIC_FF_SUCAMEC != true) la URL
// directa devuelve 404 en vez de renderizar una página sin backend.
export default function SucamecPage() {
  if (!features.sucamec) {
    notFound();
  }
  return <SucamecPageContent />;
}

function SucamecPageContent() {
  const hook = useSucamec();

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Carnets SUCAMEC</h1>
          <p className="text-muted-foreground">Vista general de carnets de agentes de seguridad</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={hook.handleNuevoCarnet}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Carnet
          </Button>
          <Button variant="outline" onClick={hook.handleExportExcel} disabled={hook.carnets.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {hook.resumen && (
        <SucamecResumenCards
          resumen={hook.resumen}
          onFilterVigentes={() => hook.setFilters({ estado: 'ACTIVO', por_vencer: '' })}
          onFilterPorVencer={() => hook.setFilters({ por_vencer: 'true', estado: '' })}
          onFilterVencidos={() => hook.setFilters({ estado: 'PENDIENTE', por_vencer: '' })}
          onFilterSuspendidos={() => hook.setFilters({ estado: 'SUSPENDIDO', por_vencer: '' })}
          onClearFilters={() => { hook.clearFilters(); hook.setBuscarInput(''); }}
        />
      )}

      <SucamecFiltros
        buscarInput={hook.buscarInput}
        onBuscarChange={(v) => { hook.setBuscarInput(v); hook.debouncedSetBuscar(v); }}
        categorias={hook.categorias}
        getFilter={hook.getFilter}
        setFilter={hook.setFilter}
        setFilters={hook.setFilters}
        clearFilters={hook.clearFilters}
        orden={hook.orden}
        setOrden={hook.setOrden}
      />

      <SucamecTabla carnets={hook.carnets} loading={hook.loading} />

      {hook.meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {hook.carnets.length} de {hook.meta.total} carnets
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => hook.setPage(hook.page - 1)}
              disabled={hook.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {hook.page} de {hook.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => hook.setPage(hook.page + 1)}
              disabled={hook.page >= hook.meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <NuevoCarnetDialog
        open={hook.showNuevoModal}
        onOpenChange={hook.setShowNuevoModal}
        form={hook.form}
        setForm={hook.setForm}
        saving={hook.saving}
        carnetFile={hook.carnetFile}
        setCarnetFile={hook.setCarnetFile}
        empleadoSearch={hook.empleadoSearch}
        setEmpleadoSearch={hook.setEmpleadoSearch}
        empleados={hook.empleados}
        loadingEmpleados={hook.loadingEmpleados}
        showEmpleadoResults={hook.showEmpleadoResults}
        setShowEmpleadoResults={hook.setShowEmpleadoResults}
        selectedEmpleado={hook.selectedEmpleado}
        onSelectEmpleado={hook.handleSelectEmpleado}
        onClearEmpleado={hook.handleClearEmpleado}
        onSearchEmpleados={hook.debouncedSearchEmpleados}
        getEmpleadoLabel={hook.getEmpleadoLabel}
        onCrear={hook.handleCrearCarnet}
      />
    </div>
  );
}
