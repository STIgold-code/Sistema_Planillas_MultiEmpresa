'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  CarnetSucamec,
  SucamecResumen,
  CategoriaSucamecOption,
  CategoriaSucamec,
} from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toDateString } from '@/lib/utils';

export interface SucamecResponse {
  data: CarnetSucamec[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface EmpleadoBasico {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
}

export interface CarnetForm {
  empleado_id: number | null;
  numero_carnet: string;
  categoria: CategoriaSucamec;
  fecha_emision: string;
  fecha_vencimiento: string;
  observaciones: string;
}

export const CATEGORIAS_SUCAMEC: CategoriaSucamecOption[] = [
  { value: 'BASICO', label: 'Agente Basico' },
  { value: 'ESPECIALIZADO', label: 'Agente Especializado' },
  { value: 'RESGUARDO', label: 'Resguardo Personal' },
  { value: 'PROTECCION', label: 'Proteccion de Instalaciones' },
  { value: 'TRANSPORTE', label: 'Transporte de Valores' },
  { value: 'TECNOLOGIA', label: 'Vigilancia Electronica' },
  { value: 'CAPACITADOR', label: 'Capacitador/Instructor' },
];

export const initialFormState: CarnetForm = {
  empleado_id: null,
  numero_carnet: '',
  categoria: 'BASICO',
  fecha_emision: '',
  fecha_vencimiento: '',
  observaciones: '',
};

export function useSucamec() {
  const { getFilter, setFilter, setFilters, clearFilters, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [carnets, setCarnets] = useState<CarnetSucamec[]>([]);
  const [resumen, setResumen] = useState<SucamecResumen | null>(null);
  const [categorias, setCategorias] = useState<CategoriaSucamecOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [orden, setOrden] = useState<'desc' | 'asc'>('asc');

  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [form, setForm] = useState<CarnetForm>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [carnetFile, setCarnetFile] = useState<File | null>(null);

  const [empleadoSearch, setEmpleadoSearch] = useState('');
  const [empleados, setEmpleados] = useState<EmpleadoBasico[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [showEmpleadoResults, setShowEmpleadoResults] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoBasico | null>(null);

  const fetchCarnets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      const buscar = getFilter('buscar');
      const estado = getFilter('estado');
      const categoria = getFilter('categoria');
      const porVencer = getFilter('por_vencer');
      const fechaDesde = getFilter('fecha_desde');
      const fechaHasta = getFilter('fecha_hasta');
      if (buscar) params.append('buscar', buscar);
      if (estado) params.append('estado', estado);
      if (categoria) params.append('categoria', categoria);
      if (porVencer === 'true') params.append('por_vencer', 'true');
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      params.append('orden', orden);

      const response = await api.get<SucamecResponse>(`/sucamec?${params.toString()}`);
      setCarnets(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching carnets SUCAMEC:', error);
      toast.error('Error al cargar los carnets SUCAMEC');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async () => {
    try {
      const data = await api.get<SucamecResumen>('/sucamec/resumen');
      setResumen(data);
    } catch (error) {
      console.error('Error fetching resumen:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const data = await api.get<CategoriaSucamecOption[]>('/sucamec/categorias');
      setCategorias(data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const searchEmpleados = async (query: string) => {
    if (!query || query.length < 2) {
      setEmpleados([]);
      return;
    }
    setLoadingEmpleados(true);
    try {
      const response = await api.get<{ data: EmpleadoBasico[] }>(`/empleados?buscar=${encodeURIComponent(query)}&limit=10&estado=ACTIVO`);
      setEmpleados(response.data || []);
    } catch (error) {
      console.error('Error searching empleados:', error);
      setEmpleados([]);
    } finally {
      setLoadingEmpleados(false);
    }
  };

  const debouncedSearchEmpleados = useDebouncedCallback(searchEmpleados, 300);

  const handleNuevoCarnet = () => {
    setForm({
      ...initialFormState,
      fecha_emision: toDateString(new Date()),
    });
    setSelectedEmpleado(null);
    setEmpleadoSearch('');
    setEmpleados([]);
    setCarnetFile(null);
    setShowNuevoModal(true);
  };

  const handleSelectEmpleado = (empleado: EmpleadoBasico) => {
    setSelectedEmpleado(empleado);
    setForm(prev => ({ ...prev, empleado_id: empleado.id }));
    setShowEmpleadoResults(false);
    setEmpleadoSearch('');
  };

  const handleClearEmpleado = () => {
    setSelectedEmpleado(null);
    setForm(prev => ({ ...prev, empleado_id: null }));
    setEmpleadoSearch('');
  };

  const handleCrearCarnet = async () => {
    if (!form.empleado_id) {
      toast.error('Seleccione un empleado');
      return;
    }
    if (!form.numero_carnet || !form.fecha_emision || !form.fecha_vencimiento) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('empleado_id', String(form.empleado_id));
      formData.append('numero_carnet', form.numero_carnet.toUpperCase());
      formData.append('categoria', form.categoria);
      formData.append('fecha_emision', form.fecha_emision);
      formData.append('fecha_vencimiento', form.fecha_vencimiento);
      if (form.observaciones) {
        formData.append('observaciones', form.observaciones);
      }
      if (carnetFile) {
        formData.append('file', carnetFile);
      }

      await api.upload('/sucamec', formData);

      toast.success('Carnet SUCAMEC registrado correctamente');
      setShowNuevoModal(false);
      fetchCarnets();
      fetchResumen();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear carnet';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getEmpleadoLabel = (empleado: EmpleadoBasico) => {
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres} (${empleado.numero_documento})`;
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Generando archivo Excel...');
      const response = await api.getBlob('/sucamec/exportar/excel');
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carnets_sucamec_${format(new Date(), 'yyyyMMdd')}.xlsx`;
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

  useEffect(() => {
    fetchResumen();
    fetchCategorias();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCarnets(); }, [filterParams, orden]);

  return {
    // State
    carnets, resumen, categorias, loading, meta, orden, setOrden,
    buscarInput, setBuscarInput, debouncedSetBuscar,
    // Modal state
    showNuevoModal, setShowNuevoModal,
    form, setForm,
    saving,
    carnetFile, setCarnetFile,
    // Empleado search
    empleadoSearch, setEmpleadoSearch,
    empleados,
    loadingEmpleados,
    showEmpleadoResults, setShowEmpleadoResults,
    selectedEmpleado,
    // Handlers
    handleNuevoCarnet,
    handleSelectEmpleado,
    handleClearEmpleado,
    handleCrearCarnet,
    handleExportExcel,
    getEmpleadoLabel,
    // URL filters
    getFilter, setFilter, setFilters, clearFilters, page, setPage,
    // Debounced
    debouncedSearchEmpleados,
  };
}
