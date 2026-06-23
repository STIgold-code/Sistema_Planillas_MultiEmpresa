'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Contrato, PlantillaContrato } from '@/types';
import { toast } from 'sonner';
import { differenceInDays, differenceInMonths } from 'date-fns';
import { Cliente, Sede, PlantillaDocumento, Cargo, ContratoForm } from './contratos.types';

function calcularDuracionVinculo(fechaInicio: string, fechaFin?: string | null): string {
  if (!fechaInicio) return '';
  try {
    const [y1, m1, d1] = fechaInicio.split('T')[0].split('-');
    const inicio = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1));
    const fin = fechaFin
      ? (() => { const [y2, m2, d2] = fechaFin.split('T')[0].split('-'); return new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2)); })()
      : new Date();
    const meses = differenceInMonths(fin, inicio);
    const diasRestantes = differenceInDays(fin, new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate()));
    if (meses >= 12) {
      const anos = Math.floor(meses / 12);
      const mesesResto = meses % 12;
      return mesesResto > 0 ? `${anos}a ${mesesResto}m` : `${anos}a`;
    }
    return diasRestantes > 0 ? `${meses}m ${diasRestantes}d` : `${meses}m`;
  } catch { return ''; }
}

interface UseContratosDataParams {
  empleadoId: number;
  form: ContratoForm;
  setForm: React.Dispatch<React.SetStateAction<ContratoForm>>;
}

export function useContratosData({ empleadoId, form, setForm }: UseContratosDataParams) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantillas, setPlantillas] = useState<PlantillaContrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedesFiltradas, setSedesFiltradas] = useState<Sede[]>([]);
  const [plantillasBanco, setPlantillasBanco] = useState<PlantillaDocumento[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [tiposCese, setTiposCese] = useState<{ id: number; nombre: string }[]>([]);
  const [expandedVinculos, setExpandedVinculos] = useState<Set<number>>(new Set());

  const fetchContratos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Contrato[] }>(
        `/contratos?empleado_id=${empleadoId}&limit=100`
      );
      setContratos(response.data || []);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar contratos'));
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  const fetchPlantillas = useCallback(async (): Promise<PlantillaContrato[]> => {
    try {
      const response = await api.get<{ data: PlantillaContrato[] }>(
        '/plantillas-contrato?limit=100'
      );
      const data = response.data || [];
      setPlantillas(data);
      return data;
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
      return [];
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const response = await api.get<{ data: Cliente[] }>('/clientes?limit=200&activo=true');
      setClientes(response.data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  }, []);

  const fetchSedes = useCallback(async (): Promise<Sede[]> => {
    try {
      const response = await api.get<{ data: Sede[] }>('/sedes?limit=500&activo=true');
      const data = response.data || [];
      setSedes(data);
      return data;
    } catch (error) {
      console.error('Error al cargar sedes:', error);
      return [];
    }
  }, []);

  const fetchPlantillasBanco = useCallback(async () => {
    try {
      const response = await api.get<PlantillaDocumento[]>('/banco-documentos/plantillas?activo=true');
      setPlantillasBanco(response || []);
    } catch (error) {
      console.error('Error al cargar plantillas banco:', error);
    }
  }, []);

  const fetchCargos = useCallback(async () => {
    try {
      const response = await api.get<Cargo[]>('/masters/cargos');
      setCargos(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error al cargar cargos:', error);
    }
  }, []);

  const handleClienteChange = (clienteId: string) => {
    setForm(prev => ({ ...prev, cliente_id: clienteId, sede_id: '', lugar_trabajo: '' }));
    if (clienteId) {
      const filtradas = sedes.filter(s => s.cliente_id === parseInt(clienteId));
      setSedesFiltradas(filtradas);
    } else {
      setSedesFiltradas([]);
    }
  };

  const handleSedeChange = (sedeId: string) => {
    setForm(prev => ({ ...prev, sede_id: sedeId }));
    if (sedeId) {
      const sede = sedes.find(s => s.id === parseInt(sedeId));
      if (sede?.direccion) {
        setForm(prev => ({ ...prev, lugar_trabajo: sede.direccion || '' }));
      }
    }
  };

  useEffect(() => {
    fetchContratos();
    fetchPlantillas();
    fetchClientes();
    fetchSedes();
    fetchPlantillasBanco();
    fetchCargos();
    api.get<{ id: number; nombre: string; activo: boolean }[]>('/masters/tipos-cese')
      .then((data) => setTiposCese(data.filter((t) => t.activo)))
      .catch(() => { });
  }, [fetchContratos, fetchPlantillas, fetchClientes, fetchSedes, fetchCargos]);

  const vinculosAgrupados = useMemo(() => {
    if (contratos.length === 0) return [];

    const gruposMap = new Map<number, Contrato[]>();
    contratos.forEach((contrato) => {
      const vinculoId = contrato.vinculo_laboral_id || contrato.id;
      if (!gruposMap.has(vinculoId)) {
        gruposMap.set(vinculoId, []);
      }
      gruposMap.get(vinculoId)!.push(contrato);
    });

    const resultado: Array<{
      id: number;
      contratos: Contrato[];
      duracion: string;
      numero: number;
      descripcion: string;
      estado: 'ACTIVO' | 'CERRADO';
      fechaInicio: string;
      fechaFin: string | null;
      motivoCierre: string | null;
    }> = [];
    let numeroVinculo = 1;

    const gruposOrdenados = Array.from(gruposMap.entries()).sort((a, b) => {
      const fechaA = a[1].reduce((min, c) => {
        const fecha = new Date(c.fecha_inicio);
        return fecha < min ? fecha : min;
      }, new Date());
      const fechaB = b[1].reduce((min, c) => {
        const fecha = new Date(c.fecha_inicio);
        return fecha < min ? fecha : min;
      }, new Date());
      return fechaA.getTime() - fechaB.getTime();
    });

    gruposOrdenados.forEach(([vinculoId, contratosGrupo]) => {
      const contratosOrdenados = [...contratosGrupo].sort(
        (a, b) => (b.numero_renovacion || 1) - (a.numero_renovacion || 1)
      );

      const vinculoData = contratosOrdenados[0]?.vinculo_laboral;
      const fechaInicioVinculo = vinculoData?.fecha_inicio ||
        contratosOrdenados.reduce((min, c) => (c.fecha_inicio < min ? c.fecha_inicio : min), contratosOrdenados[0].fecha_inicio);

      const fechaFin = vinculoData?.fecha_fin ||
        (vinculoData?.estado === 'CERRADO' ? contratosOrdenados[0].fecha_fin : null);
      const duracion = calcularDuracionVinculo(fechaInicioVinculo, fechaFin);

      const tieneContratoVigente = contratosOrdenados.some(c => c.estado === 'ACTIVO');
      const estadoVinculo = vinculoData?.estado || (tieneContratoVigente ? 'ACTIVO' : 'CERRADO');
      const descripcion = numeroVinculo === 1 ? 'Primer Ingreso' : 'Reingreso';

      // Motivo del cierre del vínculo: prioridad vinculo_laboral.motivo_cierre,
      // fallback al motivo_cese del ultimo contrato cesado del vinculo.
      const motivoCierre =
        vinculoData?.motivo_cierre ||
        contratosOrdenados.find((c) => c.motivo_cese)?.motivo_cese ||
        null;

      resultado.push({
        id: vinculoId,
        contratos: contratosOrdenados,
        duracion,
        numero: numeroVinculo,
        descripcion,
        estado: estadoVinculo as 'ACTIVO' | 'CERRADO',
        fechaInicio: fechaInicioVinculo,
        fechaFin: fechaFin ?? null,
        motivoCierre,
      });
      numeroVinculo++;
    });

    const vinculoActivo = resultado.find(v => v.estado === 'ACTIVO');
    if (vinculoActivo && expandedVinculos.size === 0) {
      setExpandedVinculos(new Set([vinculoActivo.id]));
    }

    return resultado;
  }, [contratos]);

  const toggleVinculo = (vinculoId: number) => {
    setExpandedVinculos(prev => {
      const next = new Set(prev);
      if (next.has(vinculoId)) {
        next.delete(vinculoId);
      } else {
        next.add(vinculoId);
      }
      return next;
    });
  };

  return {
    contratos,
    setContratos,
    loading,
    plantillas,
    clientes,
    sedes,
    sedesFiltradas,
    setSedesFiltradas,
    plantillasBanco,
    cargos,
    tiposCese,
    fetchContratos,
    fetchPlantillas,
    fetchSedes,
    handleClienteChange,
    handleSedeChange,
    expandedVinculos,
    toggleVinculo,
    vinculosAgrupados,
  };
}
