'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';
import { api, getAccessToken } from '@/lib/api';
import { TareoGrillaResponse, TareoGrillaEmpleado, DiasConJustificacion, TareoJustificacion } from '@/types';
import { useSesionTareo } from '@/hooks/useSesionTareo';
import { toast } from 'sonner';
import { descargarErroresImportacionExcel } from './tareo-import-errores';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportError {
  fila: number;
  columna: string;
  dia: number | null;
  tipo: 'DNI_NO_ENCONTRADO' | 'CODIGO_NO_RECONOCIDO' | 'DIA_FUERA_CONTRATO' | 'CELDA_VACIA' | 'DNI_INVALIDO';
  valor: string;
  mensaje: string;
  empleado?: string;
}

export interface ImportPreview {
  preview: {
    empleadosEncontrados: number;
    celdasActualizar: number;
    codigosNoReconocidos: string[];
    dnisNoEncontrados: string[];
  };
  cambios: Array<{
    empleado_id: number;
    dni: string;
    nombre: string;
    dia: number;
    codigoActual: string | null;
    codigoNuevo: string | null;
  }>;
  errores: ImportError[];
}

export interface CeldaModificada {
  tareo_id: number;
  dia: number;
  tipo_marcacion_id: number | null;
  detalle_id: number | null;
}

export interface CeldaPos {
  tareoId: number;
  empleadoIndex: number;
  dia: number;
}

export interface RangoRectangular {
  empleadoIndexInicio: number;
  empleadoIndexFin: number;
  diaInicio: number;
  diaFin: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTareoDetalle() {
  const params = useParams();
  const router = useRouter();
  const periodoId = Number(params.periodoId);

  // ── Data & loading ──────────────────────────────────────────────────────────
  const [data, setData] = useState<TareoGrillaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Filters & pagination ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAreaId, setFilterAreaId] = useState<string>('all');
  const [filterSedeId, setFilterSedeId] = useState<string>('all');
  const [filterDiaDesde, setFilterDiaDesde] = useState<number | null>(null);
  const [filterDiaHasta, setFilterDiaHasta] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Cell selection ──────────────────────────────────────────────────────────
  const [celdaActiva, setCeldaActiva] = useState<{ tareoId: number; dia: number } | null>(null);
  const [rangoInicio, setRangoInicio] = useState<CeldaPos | null>(null);
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoRectangular | null>(null);
  const [showRangoPopup, setShowRangoPopup] = useState(false);

  // ── Pending changes ─────────────────────────────────────────────────────────
  const [cambiosPendientes, setCambiosPendientes] = useState<Map<string, CeldaModificada>>(new Map());

  // ── History dialog ──────────────────────────────────────────────────────────
  const [historialDialog, setHistorialDialog] = useState<{ open: boolean; detalleId: number | null }>({
    open: false,
    detalleId: null,
  });
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // ── Import/Export ───────────────────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  // ── Sync employees ──────────────────────────────────────────────────────────
  const [sincronizando, setSincronizando] = useState(false);

  // ── View mode ───────────────────────────────────────────────────────────────
  const [isMobileView, setIsMobileView] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // ── Justificaciones ─────────────────────────────────────────────────────────
  const [diasConJustificacion, setDiasConJustificacion] = useState<DiasConJustificacion>({});
  const [justificacionModal, setJustificacionModal] = useState<{
    open: boolean;
    tareoId: number;
    empleadoNombre: string;
    empleadoId: number;
    diaInicial?: number;
    diaFinal?: number;
    justificacionExistente?: TareoJustificacion;
  } | null>(null);
  const [historialDrawer, setHistorialDrawer] = useState<{
    open: boolean;
    empleadoId: number;
    empleadoNombre: string;
    tareoId: number;
  } | null>(null);

  // ── Sesión de tareo ─────────────────────────────────────────────────────────
  const sesionTareo = useSesionTareo(periodoId);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const parentRef = useRef<HTMLDivElement>(null);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (cambiosPendientes.size === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cambiosPendientes.size]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
      setFiltersOpen(window.innerWidth >= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (page = 1, buscar = '', areaId = 'all', sedeId = 'all') => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('page', page.toString());
      searchParams.append('limit', '20');
      if (buscar) searchParams.append('buscar', buscar);
      if (areaId !== 'all') searchParams.append('area_id', areaId);
      if (sedeId !== 'all') searchParams.append('sede_id', sedeId);

      const response = await api.get<TareoGrillaResponse>(
        `/tareo/periodos/${periodoId}/grilla?${searchParams.toString()}`
      );
      setData(response);
    } catch (error: any) {
      console.error('Error fetching grilla:', error);
      toast.error(error.message || 'Error al cargar la grilla');
    } finally {
      setLoading(false);
    }
  }, [periodoId]);

  const fetchDiasConJustificacion = useCallback(async () => {
    try {
      const response = await api.get<DiasConJustificacion>(
        `/tareo/periodos/${periodoId}/justificaciones/dias`
      );
      setDiasConJustificacion(response);
    } catch (error) {
      console.error('Error fetching dias con justificacion:', error);
    }
  }, [periodoId]);

  useEffect(() => {
    if (periodoId) {
      fetchData(1, '', 'all', 'all');
      fetchDiasConJustificacion();
    }
  }, [periodoId, fetchData, fetchDiasConJustificacion]);

  useEffect(() => {
    if (periodoId && !loading && data) {
      fetchData(currentPage, searchTerm, filterAreaId, filterSedeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (periodoId && data) {
        setCurrentPage(1);
        fetchData(1, searchTerm, filterAreaId, filterSedeId);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // ─── Filter handlers ──────────────────────────────────────────────────────────

  const handleFilterAreaChange = (value: string) => {
    setFilterAreaId(value);
    setCurrentPage(1);
    fetchData(1, searchTerm, value, filterSedeId);
  };

  const handleFilterSedeChange = (value: string) => {
    setFilterSedeId(value);
    setCurrentPage(1);
    fetchData(1, searchTerm, filterAreaId, value);
  };

  const handleLimpiarFiltroFechas = () => {
    setFilterDiaDesde(null);
    setFilterDiaHasta(null);
  };

  // ─── Cell interaction handlers ────────────────────────────────────────────────

  const empleadosFiltrados = data?.empleados || [];

  const handleCeldaClick = (tareoId: number, dia: number, empleadoIndex: number, event: React.MouseEvent) => {
    if (data?.periodo.estado === 'CERRADO' || data?.periodo.estado === 'ANULADO') return;

    if (!sesionTareo.puedeEditar) {
      if (!sesionTareo.sesion) {
        toast.error('Debes iniciar una sesión de tareo para editar. Usa el botón en el banner.');
      } else {
        toast.error('Tu sesión ha expirado. Solicita una extensión o contacta al corrector.');
      }
      return;
    }

    if (!rangoInicio) {
      setRangoInicio({ tareoId, empleadoIndex, dia });
      setCeldaActiva(null);
      setRangoSeleccionado(null);
      return;
    }

    if (event.shiftKey) {
      const empInicio = Math.min(rangoInicio.empleadoIndex, empleadoIndex);
      const empFin = Math.max(rangoInicio.empleadoIndex, empleadoIndex);
      const diaInicio = Math.min(rangoInicio.dia, dia);
      const diaFin = Math.max(rangoInicio.dia, dia);
      setRangoSeleccionado({ empleadoIndexInicio: empInicio, empleadoIndexFin: empFin, diaInicio, diaFin });
      setShowRangoPopup(true);
      setRangoInicio(null);
      return;
    }

    if (rangoInicio.tareoId === tareoId && rangoInicio.dia === dia) {
      setCeldaActiva({ tareoId, dia });
      setRangoInicio(null);
      setRangoSeleccionado(null);
      return;
    }

    setRangoInicio({ tareoId, empleadoIndex, dia });
    setRangoSeleccionado(null);
  };

  const handleColumnHeaderClick = (dia: number) => {
    if (data?.periodo.estado === 'CERRADO' || data?.periodo.estado === 'ANULADO') return;

    if (!sesionTareo.puedeEditar) {
      if (!sesionTareo.sesion) {
        toast.error('Debes iniciar una sesión de tareo para editar. Usa el botón en el banner.');
      } else {
        toast.error('Tu sesión ha expirado. Solicita una extensión o contacta al corrector.');
      }
      return;
    }

    setRangoSeleccionado({
      empleadoIndexInicio: 0,
      empleadoIndexFin: empleadosFiltrados.length - 1,
      diaInicio: dia,
      diaFin: dia,
    });
    setShowRangoPopup(true);
    setRangoInicio(null);
  };

  const cancelarRango = () => {
    setRangoInicio(null);
    setRangoSeleccionado(null);
    setShowRangoPopup(false);
  };

  const aplicarMarcacionRango = (tipoId: number | null) => {
    if (!rangoSeleccionado || !data) return;

    const tipo = data.tipos_marcacion.find(t => t.id === tipoId);
    let celdasAfectadas = 0;
    const cambiosNuevos = new Map<string, CeldaModificada>();

    for (let empIdx = rangoSeleccionado.empleadoIndexInicio; empIdx <= rangoSeleccionado.empleadoIndexFin; empIdx++) {
      const empleado = empleadosFiltrados[empIdx];
      if (!empleado) continue;

      for (let dia = rangoSeleccionado.diaInicio; dia <= rangoSeleccionado.diaFin; dia++) {
        const diaData = empleado.dias.find(d => d.dia === dia);
        if (diaData && !diaData.en_contrato) continue;

        const key = `${empleado.tareo_id}-${dia}`;
        cambiosNuevos.set(key, {
          tareo_id: empleado.tareo_id,
          dia,
          tipo_marcacion_id: tipoId,
          detalle_id: diaData?.detalle_id || null,
        });
        celdasAfectadas++;
      }
    }

    setCambiosPendientes(prev => {
      const newMap = new Map(prev);
      cambiosNuevos.forEach((value, key) => newMap.set(key, value));
      return newMap;
    });

    setData(prevData => {
      if (!prevData) return prevData;
      const newEmpleados = prevData.empleados.map((emp, idx) => {
        if (idx < rangoSeleccionado.empleadoIndexInicio || idx > rangoSeleccionado.empleadoIndexFin) return emp;
        const newDias = emp.dias.map(d => {
          if (d.dia < rangoSeleccionado.diaInicio || d.dia > rangoSeleccionado.diaFin) return d;
          if (!d.en_contrato) return d;
          return { ...d, tipo_marcacion_id: tipoId, codigo: tipo?.codigo || null, color: tipo?.color || null };
        });
        return { ...emp, dias: newDias };
      });
      return { ...prevData, empleados: newEmpleados };
    });

    const numEmpleados = rangoSeleccionado.empleadoIndexFin - rangoSeleccionado.empleadoIndexInicio + 1;
    const numDias = rangoSeleccionado.diaFin - rangoSeleccionado.diaInicio + 1;
    toast.success(`Marcación aplicada a ${celdasAfectadas} celdas (${numEmpleados} empleados × ${numDias} días)`);
    cancelarRango();
  };

  const handleSelectMarcacion = (empleado: TareoGrillaEmpleado, dia: number, tipoId: number | null) => {
    const key = `${empleado.tareo_id}-${dia}`;
    const diaData = empleado.dias.find(d => d.dia === dia);

    setCambiosPendientes(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        tareo_id: empleado.tareo_id,
        dia,
        tipo_marcacion_id: tipoId,
        detalle_id: diaData?.detalle_id || null,
      });
      return newMap;
    });

    setData(prevData => {
      if (!prevData) return prevData;
      const newEmpleados = prevData.empleados.map(emp => {
        if (emp.tareo_id !== empleado.tareo_id) return emp;
        const newDias = emp.dias.map(d => {
          if (d.dia !== dia) return d;
          const tipo = prevData.tipos_marcacion.find(t => t.id === tipoId);
          return { ...d, tipo_marcacion_id: tipoId, codigo: tipo?.codigo || null, color: tipo?.color || null };
        });
        return { ...emp, dias: newDias };
      });
      return { ...prevData, empleados: newEmpleados };
    });

    setCeldaActiva(null);
  };

  // ─── Save handler ─────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (cambiosPendientes.size === 0) {
      toast.info('No hay cambios pendientes');
      return;
    }

    setSaving(true);
    try {
      const celdas = Array.from(cambiosPendientes.values()).map(c => {
        const empleado = data?.empleados.find(e => e.tareo_id === c.tareo_id);
        const tipoMarcacion = data?.tipos_marcacion.find(t => t.id === c.tipo_marcacion_id);
        return {
          empleado_id: empleado?.empleado_id || 0,
          dia: c.dia,
          codigo: tipoMarcacion?.codigo || null,
        };
      });

      await api.patch(`/tareo/periodos/${periodoId}/bulk`, { celdas });
      toast.success(`${cambiosPendientes.size} cambios guardados`);
      setCambiosPendientes(new Map());
      fetchData(currentPage, searchTerm, filterAreaId, filterSedeId);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  // ─── History handler ──────────────────────────────────────────────────────────

  const handleVerHistorial = async (detalleId: number) => {
    setHistorialDialog({ open: true, detalleId });
    setLoadingHistorial(true);
    try {
      const response = await api.get<{ detalle: any; historial: any[] }>(`/tareo/detalle/${detalleId}/historial`);
      setHistorial(response.historial);
    } catch (error: any) {
      toast.error('Error al cargar historial');
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────────

  const handleExportar = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tareo/periodos/${periodoId}/exportar`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` },
      });
      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tareo_${meses[data!.periodo.mes - 1]}_${data!.periodo.anio}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Excel exportado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar');
    }
  };

  // ─── Import ───────────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportLoading(true);
    setImportPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tareo/periodos/${periodoId}/importar/preview`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${getAccessToken()}` }, body: formData }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al procesar archivo');
      }

      const preview = await response.json();
      setImportPreview(preview);
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar archivo');
      setImportFile(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleAplicarImportacion = async () => {
    if (!importPreview) return;

    setApplying(true);
    try {
      const cambios = importPreview.cambios.map(c => ({
        empleado_id: c.empleado_id,
        dia: c.dia,
        codigo: c.codigoNuevo,
      }));

      const response = await api.post<{ total: number; aplicados: number; errores: number }>(
        `/tareo/periodos/${periodoId}/importar/aplicar`,
        { cambios }
      );

      toast.success(`${response.aplicados} cambios aplicados correctamente`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview(null);
      fetchData(currentPage, searchTerm, filterAreaId, filterSedeId);
    } catch (error: any) {
      toast.error(error.message || 'Error al aplicar cambios');
    } finally {
      setApplying(false);
    }
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview(null);
  };

  const handleDescargarErrores = async () => {
    await descargarErroresImportacionExcel({
      importPreview,
      importFile,
      periodo: data?.periodo,
    });
  };

  // ─── Sync employees ───────────────────────────────────────────────────────────

  const handleSincronizarEmpleados = async () => {
    setSincronizando(true);
    try {
      const response = await api.post<{ message: string; agregados: number; total_empleados: number }>(
        `/tareo/periodos/${periodoId}/sincronizar`
      );
      if (response.agregados > 0) {
        toast.success(response.message);
        fetchData(currentPage, searchTerm, filterAreaId, filterSedeId);
      } else {
        toast.info(response.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar empleados');
    } finally {
      setSincronizando(false);
    }
  };

  // ─── Mobile range handler ─────────────────────────────────────────────────────

  const handleApplyRangeFromMobile = (tareoId: number, diaInicio: number, diaFin: number, tipoId: number | null) => {
    if (!data) return;
    const empleado = data.empleados.find(e => e.tareo_id === tareoId);
    if (!empleado) return;

    for (let dia = diaInicio; dia <= diaFin; dia++) {
      const key = `${tareoId}-${dia}`;
      const diaData = empleado.dias.find(d => d.dia === dia);

      setCambiosPendientes(prev => {
        const newMap = new Map(prev);
        newMap.set(key, {
          tareo_id: tareoId,
          dia,
          tipo_marcacion_id: tipoId,
          detalle_id: diaData?.detalle_id || null,
        });
        return newMap;
      });
    }

    setData(prevData => {
      if (!prevData) return prevData;
      const tipo = prevData.tipos_marcacion.find(t => t.id === tipoId);
      const newEmpleados = prevData.empleados.map(emp => {
        if (emp.tareo_id !== tareoId) return emp;
        const newDias = emp.dias.map(d => {
          if (d.dia < diaInicio || d.dia > diaFin) return d;
          return { ...d, tipo_marcacion_id: tipoId, codigo: tipo?.codigo || null, color: tipo?.color || null };
        });
        return { ...emp, dias: newDias };
      });
      return { ...prevData, empleados: newEmpleados };
    });
  };

  // ─── Derived values ───────────────────────────────────────────────────────────

  return {
    // Router
    router,
    periodoId,

    // Data
    data,
    loading,
    saving,
    empleadosFiltrados,

    // Filters
    searchTerm,
    setSearchTerm,
    filterAreaId,
    filterSedeId,
    filterDiaDesde,
    setFilterDiaDesde,
    filterDiaHasta,
    setFilterDiaHasta,
    currentPage,
    setCurrentPage,
    filtersOpen,
    setFiltersOpen,

    // Cell selection
    celdaActiva,
    setCeldaActiva,
    rangoInicio,
    rangoSeleccionado,
    showRangoPopup,

    // Pending changes
    cambiosPendientes,

    // History
    historialDialog,
    setHistorialDialog,
    historial,
    loadingHistorial,

    // Import
    importDialogOpen,
    setImportDialogOpen,
    importFile,
    importPreview,
    importLoading,
    applying,

    // Sync
    sincronizando,

    // View
    isMobileView,

    // Justificaciones
    diasConJustificacion,
    justificacionModal,
    setJustificacionModal,
    historialDrawer,
    setHistorialDrawer,

    // Session
    sesionTareo,

    // Refs
    parentRef,

    // Handlers
    fetchData,
    fetchDiasConJustificacion,
    handleFilterAreaChange,
    handleFilterSedeChange,
    handleLimpiarFiltroFechas,
    handleCeldaClick,
    handleColumnHeaderClick,
    cancelarRango,
    aplicarMarcacionRango,
    handleSelectMarcacion,
    handleGuardar,
    handleVerHistorial,
    handleExportar,
    handleFileSelect,
    handleAplicarImportacion,
    closeImportDialog,
    handleDescargarErrores,
    handleSincronizarEmpleados,
    handleApplyRangeFromMobile,
  };
}
