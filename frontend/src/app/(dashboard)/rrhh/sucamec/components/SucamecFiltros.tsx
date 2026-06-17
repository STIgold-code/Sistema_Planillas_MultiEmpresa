'use client';

import { CategoriaSucamecOption } from '@/types';
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
import { AlertTriangle, ArrowDown, ArrowUp, Search } from 'lucide-react';

interface SucamecFiltrosProps {
  buscarInput: string;
  onBuscarChange: (value: string) => void;
  categorias: CategoriaSucamecOption[];
  getFilter: (key: string) => string;
  setFilter: (key: string, value: string) => void;
  setFilters: (filters: Record<string, string>) => void;
  clearFilters: () => void;
  orden: 'asc' | 'desc';
  setOrden: (orden: 'asc' | 'desc') => void;
}

export function SucamecFiltros({
  buscarInput,
  onBuscarChange,
  categorias,
  getFilter,
  setFilter,
  setFilters,
  clearFilters,
  orden,
  setOrden,
}: SucamecFiltrosProps) {
  const hasActiveFilters =
    getFilter('buscar') ||
    getFilter('estado') ||
    getFilter('categoria') ||
    getFilter('por_vencer') === 'true' ||
    getFilter('fecha_desde') ||
    getFilter('fecha_hasta');

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI o N carnet..."
                value={buscarInput}
                onChange={(e) => onBuscarChange(e.target.value)}
                className="pl-10 h-10 md:h-11"
              />
            </div>
            <Select value={getFilter('estado')} onValueChange={(v) => setFilters({ estado: v, por_vencer: '' })}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                <SelectItem value="ANULADO">Anulado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={getFilter('categoria')} onValueChange={(v) => setFilter('categoria', v)}>
              <SelectTrigger className="h-10 md:h-11 w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-3">
            <Input
              type="date"
              value={getFilter('fecha_desde')}
              onChange={(e) => setFilter('fecha_desde', e.target.value)}
              className="h-10 md:h-11"
              placeholder="Desde"
              title="Fecha vencimiento desde"
            />
            <Input
              type="date"
              value={getFilter('fecha_hasta')}
              onChange={(e) => setFilter('fecha_hasta', e.target.value)}
              className="h-10 md:h-11"
              placeholder="Hasta"
              title="Fecha vencimiento hasta"
            />
            {hasActiveFilters && (
              <Button variant="ghost" onClick={() => { clearFilters(); onBuscarChange(''); }} className="w-full sm:w-auto">
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Ordenar por vencimiento:</span>
            <div className="flex rounded-md border">
              <Button
                variant={orden === 'asc' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setOrden('asc')}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Pronto
              </Button>
              <Button
                variant={orden === 'desc' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none border-l"
                onClick={() => setOrden('desc')}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                Lejano
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {getFilter('por_vencer') === 'true' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Mostrando carnets que vencen en los proximos 30 dias</span>
          <Button variant="ghost" size="sm" onClick={() => setFilter('por_vencer', '')}>
            Quitar filtro
          </Button>
        </div>
      )}
    </>
  );
}
