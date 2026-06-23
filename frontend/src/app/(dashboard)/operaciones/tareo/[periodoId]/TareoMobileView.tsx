'use client';

import { useState, useMemo } from 'react';
import { TareoGrillaResponse, TareoGrillaEmpleado } from '@/types';
import type { CeldaModificada } from './useTareoDetalle';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  User,
  Building2,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TareoMobileViewProps {
  data: TareoGrillaResponse;
  cambiosPendientes: Map<string, CeldaModificada>;
  onSelectMarcacion: (empleado: TareoGrillaEmpleado, dia: number, tipoId: number | null) => void;
  onApplyRange: (tareoId: number, diaInicio: number, diaFin: number, tipoId: number | null) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterAreaId: string;
  onFilterAreaChange: (value: string) => void;
  filterSedeId: string;
  onFilterSedeChange: (value: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function TareoMobileView({
  data,
  cambiosPendientes,
  onSelectMarcacion,
  searchTerm,
  onSearchChange,
  filterAreaId,
  onFilterAreaChange,
  filterSedeId,
  onFilterSedeChange,
  currentPage,
  onPageChange,
}: TareoMobileViewProps) {
  // Estado para navegación por semana
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmpleado, setSelectedEmpleado] = useState<TareoGrillaEmpleado | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const isReadonly = data.periodo.estado === 'CERRADO' || data.periodo.estado === 'ANULADO';

  // Calcular días de la semana actual
  const diasSemana = useMemo(() => {
    const diasDelMes = data.periodo.dias_mes;
    const inicio = weekOffset * 7 + 1;
    const fin = Math.min(inicio + 6, diasDelMes);
    return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
  }, [weekOffset, data.periodo.dias_mes]);

  // Número total de semanas
  const totalSemanas = Math.ceil(data.periodo.dias_mes / 7);

  // Obtener nombre del día de la semana
  const getNombreDia = (dia: number) => {
    const fecha = new Date(data.periodo.anio, data.periodo.mes - 1, dia);
    return fecha.toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase();
  };

  // Renderizar celda de día
  const renderCelda = (empleado: TareoGrillaEmpleado, dia: number) => {
    const diaData = empleado.dias.find(d => d.dia === dia);
    const hasChange = cambiosPendientes.has(`${empleado.tareo_id}-${dia}`);
    const isFueraContrato = diaData && !diaData.en_contrato;

    if (isFueraContrato) {
      return (
        <div
          key={dia}
          className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100 opacity-50"
        >
          <span className="text-[10px] text-muted-foreground">{getNombreDia(dia)}</span>
          <span className="text-lg font-bold text-gray-400">{dia}</span>
          <span className="text-xs text-gray-400">-</span>
        </div>
      );
    }

    return (
      <button
        key={dia}
        onClick={() => {
          if (!isReadonly) {
            setSelectedEmpleado(empleado);
            setEditingDay(dia);
          }
        }}
        disabled={isReadonly}
        className={cn(
          'flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[44px]',
          'border-2 active:scale-95',
          hasChange ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-transparent',
          isReadonly ? 'opacity-75 cursor-not-allowed' : 'hover:bg-muted/50 active:bg-muted'
        )}
        style={{
          backgroundColor: diaData?.color ? `${diaData.color}20` : undefined,
        }}
      >
        <span className="text-[10px] text-muted-foreground">{getNombreDia(dia)}</span>
        <span className="text-lg font-bold" style={{ color: diaData?.color || undefined }}>
          {dia}
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: diaData?.color || 'var(--muted-foreground)' }}
        >
          {diaData?.codigo || '-'}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Filtra empleados por área o sede</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Área</label>
                <Select value={filterAreaId} onValueChange={onFilterAreaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {data.areas.map(area => (
                      <SelectItem key={area.id} value={area.id.toString()}>{area.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sede</label>
                <Select value={filterSedeId} onValueChange={onFilterSedeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sedes</SelectItem>
                    {data.sedes.map(sede => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>{sede.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => setFilterSheetOpen(false)}>
                Aplicar filtros
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Navegador de semanas */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <span className="text-sm font-medium">
            Días {diasSemana[0]} - {diasSemana[diasSemana.length - 1]}
          </span>
          <span className="text-xs text-muted-foreground block">
            Semana {weekOffset + 1} de {totalSemanas}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset(w => Math.min(totalSemanas - 1, w + 1))}
          disabled={weekOffset >= totalSemanas - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Leyenda compacta */}
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4">
        {data.tipos_marcacion.slice(0, 8).map(tipo => (
          <div
            key={tipo.id}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap shrink-0"
            style={{ backgroundColor: `${tipo.color}20`, color: tipo.color }}
          >
            <span className="font-bold">{tipo.codigo}</span>
            <span className="hidden sm:inline">= {tipo.descripcion}</span>
          </div>
        ))}
        {data.tipos_marcacion.length > 8 && (
          <span className="text-xs text-muted-foreground self-center">+{data.tipos_marcacion.length - 8}</span>
        )}
      </div>

      {/* Lista de empleados con cards */}
      <div className="space-y-3">
        {data.empleados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No se encontraron empleados
          </div>
        ) : (
          data.empleados.map((empleado) => (
            <div
              key={empleado.tareo_id}
              className="border rounded-lg overflow-hidden bg-card"
            >
              {/* Header del empleado */}
              <div className="p-3 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{empleado.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground font-mono">{empleado.numero_documento}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1" title="Días trabajados">
                      <Check className="h-3 w-3 text-green-600" />
                      {empleado.totales['DIA_TRABAJADO'] || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Faltas">
                      <X className="h-3 w-3 text-red-600" />
                      {empleado.totales['FALTA'] || 0}
                    </span>
                  </div>
                </div>
                {(empleado.area || empleado.sede) && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {empleado.area && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {empleado.area}
                      </span>
                    )}
                    {empleado.sede && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {empleado.sede}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Grid de días de la semana */}
              <div className="p-3">
                <div className="grid grid-cols-7 gap-1">
                  {diasSemana.map(dia => renderCelda(empleado, dia))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-4">
            {currentPage} / {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(data.meta.totalPages, currentPage + 1))}
            disabled={currentPage >= data.meta.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialog de selección de marcación */}
      <Dialog open={!!editingDay && !!selectedEmpleado} onOpenChange={(open) => !open && setEditingDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Marcación</DialogTitle>
            <DialogDescription>
              {selectedEmpleado && (
                <>
                  <span className="font-medium">{selectedEmpleado.nombre_completo}</span>
                  <br />
                  Día {editingDay} - {editingDay && getNombreDia(editingDay)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {data.tipos_marcacion.map(tipo => (
              <button
                key={tipo.id}
                className="p-3 rounded-lg transition-all active:scale-95 flex flex-col items-center gap-1"
                style={{ backgroundColor: `${tipo.color}25`, color: tipo.color }}
                onClick={() => {
                  if (selectedEmpleado && editingDay) {
                    onSelectMarcacion(selectedEmpleado, editingDay, tipo.id);
                    setEditingDay(null);
                    setSelectedEmpleado(null);
                  }
                }}
              >
                <span className="text-xl font-bold">{tipo.codigo}</span>
                <span className="text-[10px] truncate w-full text-center opacity-80">
                  {tipo.descripcion}
                </span>
              </button>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (selectedEmpleado && editingDay) {
                  onSelectMarcacion(selectedEmpleado, editingDay, null);
                  setEditingDay(null);
                  setSelectedEmpleado(null);
                }
              }}
            >
              Limpiar marcación
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setEditingDay(null);
                setSelectedEmpleado(null);
              }}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
