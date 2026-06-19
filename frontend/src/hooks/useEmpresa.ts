'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Empresa } from '@/types';

interface UpdateEmpresaData {
  ruc?: string;
  razon_social?: string;
  nombre_comercial?: string;
  direccion?: string;
  telefono?: string;
  centro_control?: string;
  email?: string;
  representante_legal?: string;
  dni_representante?: string;
  cargo_representante?: string;
  partida_electronica?: string;
  logo_url?: string;
  firma_representante_url?: string;
  regimen_laboral_default?: string;
}

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresa = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Empresa>('/companies/me');
      setEmpresa(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de la empresa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresa();
  }, [fetchEmpresa]);

  const updateEmpresa = useCallback(async (data: UpdateEmpresaData) => {
    if (!empresa) {
      throw new Error('No hay empresa cargada');
    }

    setUpdating(true);
    try {
      const updated = await api.patch<Empresa>(`/companies/${empresa.id}`, data);
      setEmpresa(updated);
      setError(null);
      return updated;
    } catch (err: any) {
      const errorMsg = err.message || 'Error al actualizar la empresa';
      setError(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [empresa]);

  const refetch = useCallback(() => {
    fetchEmpresa();
  }, [fetchEmpresa]);

  return { empresa, loading, updating, error, updateEmpresa, refetch };
}
