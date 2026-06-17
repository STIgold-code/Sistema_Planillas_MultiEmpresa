'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  Proveedor,
  PaginatedResponse,
} from '@/types/inventario';

export interface ProveedorFormData {
  nombre: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

const ENDPOINT = '/proveedores';

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (buscar.trim()) params.set('buscar', buscar.trim());
      const res = await api.get<PaginatedResponse<Proveedor>>(
        `${ENDPOINT}?${params.toString()}`,
      );
      setProveedores(res.data);
    } catch {
      toast.error('Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, [buscar]);

  useEffect(() => {
    const timer = setTimeout(fetchProveedores, buscar ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchProveedores, buscar]);

  const sanitize = (data: ProveedorFormData): ProveedorFormData => ({
    nombre: data.nombre.trim(),
    ruc: data.ruc?.trim() || undefined,
    contacto: data.contacto?.trim() || undefined,
    telefono: data.telefono?.trim() || undefined,
    email: data.email?.trim() || undefined,
    direccion: data.direccion?.trim() || undefined,
  });

  const crear = async (data: ProveedorFormData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, sanitize(data));
      toast.success('Proveedor creado');
      await fetchProveedores();
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
    data: ProveedorFormData,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${ENDPOINT}/${id}`, sanitize(data));
      toast.success('Proveedor actualizado');
      await fetchProveedores();
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
      await fetchProveedores();
    } catch {
      toast.error('Error al cambiar el estado');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await api.delete(`${ENDPOINT}/${id}`);
      toast.success('Proveedor eliminado');
      await fetchProveedores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return {
    proveedores,
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
