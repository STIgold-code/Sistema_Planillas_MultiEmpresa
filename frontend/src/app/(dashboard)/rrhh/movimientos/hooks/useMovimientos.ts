'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  MovimientoPersonal,
  MovimientosResumen,
  MovimientosResponse,
  TipoMovimientoFiltro,
  UltimosPeriodosConDatos,
  Tendencia,
  DatoHistorico,
  Sede,
  Area,
} from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface Cliente {
  id: number;
  razon_social: string;
  nombre_comercial?: string;
}

export const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export const ANIOS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
});

export const ESTADOS_EMPLEADO = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'CESADO', label: 'Cesado' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'PENDIENTE', label: 'Pendiente' },
];

export function useMovimientos() {
  const { getFilter, setFilter, setFilters, clearFilters, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v),
    400,
  );

  const [movimientos, setMovimientos] = useState<MovimientoPersonal[]>([]);
  const [resumen, setResumen] = useState<MovimientosResumen | null>(null);
  const [tendencia, setTendencia] = useState<Tendencia | null>(null);
  const [historico, setHistorico] = useState<DatoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [ultimosPeriodos, setUltimosPeriodos] = useState<UltimosPeriodosConDatos | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchMaestros = async () => {
    try {
      const [clientesRes, sedesRes, areasRes] = await Promise.all([
        api.get<{ data: Cliente[] }>('/clientes?limit=200&activo=true'),
        api.get<{ data: Sede[] }>('/sedes?limit=200'),
        api.get<Area[]>('/masters/areas'),
      ]);
      setClientes(clientesRes.data || []);
      setSedes(sedesRes.data || []);
      setAreas(areasRes);
    } catch (error) {
      console.error('Error fetching maestros:', error);
    }
  };

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');

      const fechaDesde = getFilter('fecha_desde');
      const fechaHasta = getFilter('fecha_hasta');
      const mes = getFilter('mes') || currentMonth.toString();
      const anio = getFilter('anio') || currentYear.toString();
      const tipo = getFilter('tipo');
      const estado = getFilter('estado');
      const clienteId = getFilter('cliente_id');
      const sedeId = getFilter('sede_id');
      const areaId = getFilter('area_id');
      const buscar = getFilter('buscar');

      if (fechaDesde && fechaHasta) {
        params.append('fecha_desde', fechaDesde);
        params.append('fecha_hasta', fechaHasta);
      } else {
        params.append('mes', mes);
        params.append('anio', anio);
      }
      if (tipo) params.append('tipo', tipo);
      if (estado) params.append('estado', estado);
      if (clienteId) params.append('cliente_id', clienteId);
      if (sedeId) params.append('sede_id', sedeId);
      if (areaId) params.append('area_id', areaId);
      if (buscar) params.append('buscar', buscar);

      const response = await api.get<MovimientosResponse>(`/movimientos-personal?${params.toString()}`);
      setMovimientos(response.data);
      setResumen(response.resumen);
      setTendencia(response.tendencia);
      setHistorico(response.historico);
      setMeta(response.meta);
      setUltimosPeriodos(response.ultimosPeriodos || null);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Generando archivo Excel...');

      const params = new URLSearchParams();
      const fechaDesde = getFilter('fecha_desde');
      const fechaHasta = getFilter('fecha_hasta');
      const mes = getFilter('mes') || currentMonth.toString();
      const anio = getFilter('anio') || currentYear.toString();
      const tipo = getFilter('tipo');
      const estado = getFilter('estado');
      const clienteId = getFilter('cliente_id');
      const sedeId = getFilter('sede_id');
      const areaId = getFilter('area_id');

      if (fechaDesde && fechaHasta) {
        params.append('fecha_desde', fechaDesde);
        params.append('fecha_hasta', fechaHasta);
      } else {
        params.append('mes', mes);
        params.append('anio', anio);
      }
      if (tipo) params.append('tipo', tipo);
      if (estado) params.append('estado', estado);
      if (clienteId) params.append('cliente_id', clienteId);
      if (sedeId) params.append('sede_id', sedeId);
      if (areaId) params.append('area_id', areaId);

      const response = await api.getBlob(`/movimientos-personal/exportar?${params.toString()}`);
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `movimientos_personal_${anio}-${mes.padStart(2, '0')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Archivo Excel exportado correctamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al exportar el archivo Excel');
    }
  };

  const handleCardClick = (tipo: TipoMovimientoFiltro | '') => {
    setFilter('tipo', tipo || '');
  };

  const hasActiveFilters = !!(
    getFilter('tipo') ||
    getFilter('estado') ||
    getFilter('cliente_id') ||
    getFilter('sede_id') ||
    getFilter('area_id') ||
    getFilter('buscar') ||
    getFilter('fecha_desde') ||
    getFilter('fecha_hasta')
  );

  const handleClearFilters = () => {
    clearFilters();
    setBuscarInput('');
    setFilters({ mes: currentMonth.toString(), anio: currentYear.toString() });
  };

  const getMesLabel = () => {
    const mes = getFilter('mes') || currentMonth.toString();
    return MESES.find((m) => m.value === mes)?.label || '';
  };

  const getAnioLabel = () => {
    return getFilter('anio') || currentYear.toString();
  };

  useEffect(() => {
    fetchMaestros();
  }, []);

  useEffect(() => {
    fetchMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams]);

  return {
    // State
    movimientos, resumen, tendencia, historico, loading, meta, ultimosPeriodos,
    clientes, sedes, areas,
    currentMonth, currentYear,
    buscarInput, setBuscarInput, debouncedSetBuscar,
    // Computed
    hasActiveFilters,
    // Handlers
    handleExportExcel,
    handleCardClick,
    handleClearFilters,
    getMesLabel,
    getAnioLabel,
    // URL filters
    getFilter, setFilter, setFilters, clearFilters, page, setPage,
  };
}
