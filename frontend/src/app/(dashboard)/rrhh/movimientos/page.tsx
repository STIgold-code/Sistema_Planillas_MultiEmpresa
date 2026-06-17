'use client';

import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMovimientos } from './hooks/useMovimientos';
import { MovimientosResumenCards } from './components/MovimientosResumenCards';
import { MovimientosHistorico } from './components/MovimientosHistorico';
import { MovimientosFiltros } from './components/MovimientosFiltros';
import { MovimientosTabla } from './components/MovimientosTabla';

export default function MovimientosPersonalPage() {
  const hook = useMovimientos();

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Movimientos de Personal</h1>
          <p className="text-muted-foreground">
            Ingresos, ceses y vencimientos de contratos - {hook.getMesLabel()} {hook.getAnioLabel()}
          </p>
        </div>
        <Button variant="outline" onClick={hook.handleExportExcel} disabled={hook.movimientos.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {hook.resumen && (
        <MovimientosResumenCards
          resumen={hook.resumen}
          tendencia={hook.tendencia}
          tipoFiltro={hook.getFilter('tipo')}
          onCardClick={hook.handleCardClick}
        />
      )}

      <MovimientosHistorico historico={hook.historico} />

      <MovimientosFiltros
        buscarInput={hook.buscarInput}
        onBuscarChange={(v) => { hook.setBuscarInput(v); hook.debouncedSetBuscar(v); }}
        clientes={hook.clientes}
        sedes={hook.sedes}
        areas={hook.areas}
        getFilter={hook.getFilter}
        setFilter={hook.setFilter}
        hasActiveFilters={hook.hasActiveFilters}
        onClearFilters={hook.handleClearFilters}
        currentMonth={hook.currentMonth}
        currentYear={hook.currentYear}
      />

      <MovimientosTabla
        movimientos={hook.movimientos}
        loading={hook.loading}
        ultimosPeriodos={hook.ultimosPeriodos}
        onNavigatePeriodo={hook.setFilters}
      />

      {hook.meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {hook.movimientos.length} de {hook.meta.total} movimientos
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
    </div>
  );
}
