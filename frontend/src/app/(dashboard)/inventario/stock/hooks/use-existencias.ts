'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ExistenciasStock } from '@/types/inventario';

export function useExistencias() {
  const [existencias, setExistencias] = useState<ExistenciasStock | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExistencias = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ExistenciasStock>(
        '/inventario/items/existencias',
      );
      setExistencias(data);
    } catch {
      toast.error('Error al cargar las existencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExistencias();
  }, [fetchExistencias]);

  return { existencias, loading, refrescar: fetchExistencias };
}
