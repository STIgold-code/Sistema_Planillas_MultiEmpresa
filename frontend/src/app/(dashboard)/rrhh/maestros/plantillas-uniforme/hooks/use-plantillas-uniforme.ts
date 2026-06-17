'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  PlantillaUniforme,
  PlantillaUniformeFormData,
} from '@/types/inventario';

const ENDPOINT = '/plantillas-uniforme';

export function usePlantillasUniforme() {
  const [plantillas, setPlantillas] = useState<PlantillaUniforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PlantillaUniforme[]>(ENDPOINT);
      setPlantillas(res);
    } catch {
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  const crear = async (data: PlantillaUniformeFormData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, data);
      toast.success('Plantilla creada');
      await fetchPlantillas();
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
    data: PlantillaUniformeFormData,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put(`${ENDPOINT}/${id}`, data);
      toast.success('Plantilla actualizada');
      await fetchPlantillas();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id: number) => {
    try {
      await api.delete(`${ENDPOINT}/${id}`);
      toast.success('Plantilla eliminada');
      await fetchPlantillas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return { plantillas, loading, saving, crear, actualizar, eliminar };
}
