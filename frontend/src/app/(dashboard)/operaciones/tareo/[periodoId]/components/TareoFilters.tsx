'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Filter, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TareoGrillaResponse } from '@/types';

interface TareoFiltersProps {
  data: TareoGrillaResponse;
  loading: boolean;
  searchTerm: string;
  filterAreaId: string;
  filterSedeId: string;
  filterDiaDesde: number | null;
  filterDiaHasta: number | null;
  currentPage: number;
  filtersOpen: boolean;
  onSearchChange: (v: string) => void;
  onFilterAreaChange: (v: string) => void;
  onFilterSedeChange: (v: string) => void;
  onFilterDiaDesdeChange: (v: number | null) => void;
  onFilterDiaHastaChange: (v: number | null) => void;
  onLimpiarFiltroFechas: () => void;
  onPageChange: (page: number) => void;
  onFiltersOpenChange: (open: boolean) => void;
}

export function TareoFilters({
  data,
  loading,
  searchTerm,
  filterAreaId,
  filterSedeId,
  filterDiaDesde,
  filterDiaHasta,
  currentPage,
  filtersOpen,
  onSearchChange,
  onFilterAreaChange,
  onFilterSedeChange,
  onFilterDiaDesdeChange,
  onFilterDiaHastaChange,
  onLimpiarFiltroFechas,
  onPageChange,
  onFiltersOpenChange,
}: TareoFiltersProps) {
  return (
    <Collapsible open={filtersOpen} onOpenChange={onFiltersOpenChange}>
      <div className="flex items-center gap-2 mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>

        {/* Paginación siempre visible */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center">
            {data.meta.page} / {data.meta.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(data.meta.totalPages || 1, currentPage + 1))}
            disabled={currentPage >= (data.meta.totalPages || 1) || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nombre o DNI..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterAreaId} onValueChange={onFilterAreaChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {data.areas.map(area => (
                <SelectItem key={area.id} value={area.id.toString()}>{area.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSedeId} onValueChange={onFilterSedeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {data.sedes.map(sede => (
                <SelectItem key={sede.id} value={sede.id.toString()}>{sede.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de rango de días */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">Días:</span>
            <Input
              type="number"
              min={1}
              max={data.periodo.dias_mes}
              placeholder="Desde"
              value={filterDiaDesde ?? ''}
              onChange={(e) => onFilterDiaDesdeChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-[70px] h-8 text-center"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              min={1}
              max={data.periodo.dias_mes}
              placeholder="Hasta"
              value={filterDiaHasta ?? ''}
              onChange={(e) => onFilterDiaHastaChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-[70px] h-8 text-center"
            />
            {(filterDiaDesde !== null || filterDiaHasta !== null) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLimpiarFiltroFechas}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
