'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { descargarArchivo } from '../../shared/descargar-archivo';
import type {
  MovimientoInventario,
  TipoMovimientoInventario,
  ResumenMovimientos,
  PaginatedResponse,
} from '@/types/inventario';

export type DireccionMovimiento = 'TODOS' | 'ENTRADAS' | 'SALIDAS';

export interface MovimientosFilters {
  direccion: DireccionMovimiento;
  tipo_movimiento: TipoMovimientoInventario | 'TODOS';
  tipo_uniforme_id: number | 'TODOS';
  desde: string;
  hasta: string;
}

interface MovimientosMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ENDPOINT = '/inventario/movimientos';
const LIMIT = 20;

const EMPTY_META: MovimientosMeta = {
  total: 0,
  page: 1,
  limit: LIMIT,
  totalPages: 1,
};

const RESUMEN_VACIO: ResumenMovimientos = {
  ENTRADA: 0,
  ENTREGA: 0,
  DEVOLUCION: 0,
  BAJA: 0,
};

export function useMovimientos() {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [meta, setMeta] = useState<MovimientosMeta>(EMPTY_META);
  const [resumen, setResumen] = useState<ResumenMovimientos>(RESUMEN_VACIO);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState<MovimientosFilters>({
    direccion: 'TODOS',
    tipo_movimiento: 'TODOS',
    tipo_uniforme_id: 'TODOS',
    desde: '',
    hasta: '',
  });

  // Cambiar un filtro resetea la paginación a la primera página.
  const setFilters = useCallback((next: MovimientosFilters) => {
    setFiltersState(next);
    setPage(1);
  }, []);

  // Parámetros de filtro compartidos por listado, resumen y export.
  const filtroParams = useCallback(
    (incluirDireccionYTipo: boolean): URLSearchParams => {
      const params = new URLSearchParams();
      if (incluirDireccionYTipo) {
        if (filters.direccion !== 'TODOS') {
          params.set('direccion', filters.direccion);
        }
        if (filters.tipo_movimiento !== 'TODOS') {
          params.set('tipo_movimiento', filters.tipo_movimiento);
        }
      }
      // La prenda sí aplica también al resumen (filtra el desglose por prenda).
      if (filters.tipo_uniforme_id !== 'TODOS') {
        params.set('tipo_uniforme_id', String(filters.tipo_uniforme_id));
      }
      if (filters.desde) params.set('desde', filters.desde);
      if (filters.hasta) params.set('hasta', filters.hasta);
      return params;
    },
    [filters],
  );

  const fetchMovimientos = useCallback(
    async (signal: () => boolean) => {
      setLoading(true);
      const params = filtroParams(true);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      try {
        const [res, res2] = await Promise.all([
          api.get<PaginatedResponse<MovimientoInventario>>(
            `${ENDPOINT}?${params.toString()}`,
          ),
          // El resumen NO lleva dirección/tipo: siempre muestra el desglose total.
          api.get<ResumenMovimientos>(
            `${ENDPOINT}/resumen?${filtroParams(false).toString()}`,
          ),
        ]);
        if (!signal()) return;
        setMovimientos(res.data);
        setMeta(res.meta);
        setResumen(res2);
      } catch {
        if (!signal()) return;
        toast.error('Error al cargar los movimientos');
      } finally {
        if (signal()) setLoading(false);
      }
    },
    [page, filtroParams],
  );

  useEffect(() => {
    let activo = true;
    fetchMovimientos(() => activo);
    return () => {
      activo = false;
    };
  }, [fetchMovimientos]);

  const descargar = useCallback(async () => {
    setDescargando(true);
    try {
      const qs = filtroParams(true).toString();
      await descargarArchivo(
        `${ENDPOINT}/export/excel${qs ? `?${qs}` : ''}`,
        'Movimientos.xlsx',
      );
    } catch {
      toast.error('No se pudo descargar el Excel');
    } finally {
      setDescargando(false);
    }
  }, [filtroParams]);

  return {
    movimientos,
    meta,
    resumen,
    loading,
    descargando,
    page,
    setPage,
    filters,
    setFilters,
    descargar,
  };
}
