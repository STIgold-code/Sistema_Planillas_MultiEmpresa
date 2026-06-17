'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  TipoUniforme,
  PaginatedResponse,
} from '@/types/inventario';

export interface TallaFormData {
  valor: string;
  /** Stock mínimo de esta talla; dispara el faltante en la vista de stock. */
  stock_minimo: number;
}

export interface TipoUniformeFormData {
  nombre: string;
  descripcion?: string;
  genero: 'UNISEX' | 'MASCULINO' | 'FEMENINO';
  precio_referencial?: number;
  cantidad_estandar: number;
  /** Tallas en el orden en que se enviarán, cada una con su stock mínimo. */
  tallas: TallaFormData[];
  /** IDs de características asociadas (M:N con el maestro de Características). */
  caracteristica_ids: number[];
}

const ENDPOINT = '/tipos-uniforme';

export function useTiposUniforme() {
  const [tipos, setTipos] = useState<TipoUniforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTipos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (buscar.trim()) params.set('buscar', buscar.trim());
      const res = await api.get<PaginatedResponse<TipoUniforme>>(
        `${ENDPOINT}?${params.toString()}`,
      );
      setTipos(res.data);
    } catch {
      toast.error('Error al cargar los tipos de uniforme');
    } finally {
      setLoading(false);
    }
  }, [buscar]);

  useEffect(() => {
    const timer = setTimeout(fetchTipos, buscar ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchTipos, buscar]);

  const crear = async (data: TipoUniformeFormData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, data);
      toast.success('Tipo de uniforme creado');
      await fetchTipos();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const actualizar = async (
    id: number,
    data: TipoUniformeFormData,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${ENDPOINT}/${id}`, data);
      toast.success('Tipo de uniforme actualizado');
      await fetchTipos();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (id: number) => {
    try {
      await api.patch(`${ENDPOINT}/${id}/toggle-activo`, {});
      await fetchTipos();
    } catch {
      toast.error('Error al cambiar el estado');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await api.delete(`${ENDPOINT}/${id}`);
      toast.success('Tipo de uniforme eliminado');
      await fetchTipos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return {
    tipos,
    loading,
    buscar,
    setBuscar,
    saving,
    crear,
    actualizar,
    toggleActivo,
    eliminar,
  };
}
