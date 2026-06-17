'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  Caracteristica,
  PaginatedResponse,
} from '@/types/inventario';

export interface CaracteristicaFormData {
  nombre: string;
  descripcion?: string;
}

const ENDPOINT = '/caracteristicas';

export function useCaracteristicas() {
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCaracteristicas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (buscar.trim()) params.set('buscar', buscar.trim());
      const res = await api.get<PaginatedResponse<Caracteristica>>(
        `${ENDPOINT}?${params.toString()}`,
      );
      setCaracteristicas(res.data);
    } catch {
      toast.error('Error al cargar las características');
    } finally {
      setLoading(false);
    }
  }, [buscar]);

  useEffect(() => {
    const timer = setTimeout(fetchCaracteristicas, buscar ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchCaracteristicas, buscar]);

  const crear = async (data: CaracteristicaFormData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, data);
      toast.success('Característica creada');
      await fetchCaracteristicas();
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
    data: CaracteristicaFormData,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${ENDPOINT}/${id}`, data);
      toast.success('Característica actualizada');
      await fetchCaracteristicas();
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
      await fetchCaracteristicas();
    } catch {
      toast.error('Error al cambiar el estado');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await api.delete(`${ENDPOINT}/${id}`);
      toast.success('Característica eliminada');
      await fetchCaracteristicas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return {
    caracteristicas,
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
