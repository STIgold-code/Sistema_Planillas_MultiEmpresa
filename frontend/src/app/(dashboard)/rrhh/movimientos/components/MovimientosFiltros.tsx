'use client';

import { Sede, Area } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Cliente, MESES, ANIOS, ESTADOS_EMPLEADO } from '../hooks/useMovimientos';

interface MovimientosFiltrosProps {
  buscarInput: string;
  onBuscarChange: (value: string) => void;
  clientes: Cliente[];
  sedes: Sede[];
  areas: Area[];
  getFilter: (key: string) => string;
  setFilter: (key: string, value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  currentMonth: number;
  currentYear: number;
}

export function MovimientosFiltros({
  buscarInput,
  onBuscarChange,
  clientes,
  sedes,
  areas,
  getFilter,
  setFilter,
  hasActiveFilters,
  onClearFilters,
  currentMonth,
  currentYear,
}: MovimientosFiltrosProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4">
          <Select
            value={getFilter('mes') || currentMonth.toString()}
            onValueChange={(v) => {
              setFilter('mes', v);
              setFilter('fecha_desde', '');
              setFilter('fecha_hasta', '');
            }}
            disabled={!!getFilter('fecha_desde') || !!getFilter('fecha_hasta')}
          >
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((mes) => (
                <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={getFilter('anio') || currentYear.toString()}
            onValueChange={(v) => {
              setFilter('anio', v);
              setFilter('fecha_desde', '');
              setFilter('fecha_hasta', '');
            }}
            disabled={!!getFilter('fecha_desde') || !!getFilter('fecha_hasta')}
          >
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {ANIOS.map((anio) => (
                <SelectItem key={anio.value} value={anio.value}>{anio.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              placeholder="Desde"
              value={getFilter('fecha_desde') || ''}
              onChange={(e) => {
                setFilter('fecha_desde', e.target.value);
                if (e.target.value) { setFilter('mes', ''); setFilter('anio', ''); }
              }}
              className="h-10 md:h-11"
            />
            <span className="text-muted-foreground text-sm">-</span>
            <Input
              type="date"
              placeholder="Hasta"
              value={getFilter('fecha_hasta') || ''}
              onChange={(e) => {
                setFilter('fecha_hasta', e.target.value);
                if (e.target.value) { setFilter('mes', ''); setFilter('anio', ''); }
              }}
              className="h-10 md:h-11"
            />
          </div>

          <Select value={getFilter('tipo')} onValueChange={(v) => setFilter('tipo', v)}>
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Tipo movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="INGRESOS">Ingresos</SelectItem>
              <SelectItem value="CESES">Ceses</SelectItem>
              <SelectItem value="VENCIMIENTOS">Vencimientos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={getFilter('estado')} onValueChange={(v) => setFilter('estado', v)}>
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Estado empleado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADOS_EMPLEADO.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={getFilter('cliente_id')} onValueChange={(v) => setFilter('cliente_id', v)}>
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id.toString()}>
                  {cliente.nombre_comercial || cliente.razon_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={getFilter('sede_id')} onValueChange={(v) => setFilter('sede_id', v)}>
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sedes</SelectItem>
              {sedes.map((sede) => (
                <SelectItem key={sede.id} value={sede.id.toString()}>{sede.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={getFilter('area_id')} onValueChange={(v) => setFilter('area_id', v)}>
            <SelectTrigger className="h-10 md:h-11 w-full">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las areas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>{area.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={buscarInput}
              onChange={(e) => onBuscarChange(e.target.value)}
              className="pl-10 h-10 md:h-11"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={onClearFilters} className="w-full lg:w-auto">
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
