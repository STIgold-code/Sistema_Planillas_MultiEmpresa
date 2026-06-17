'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Departamento {
  id: number;
  nombre: string;
}

export interface Provincia {
  id: number;
  nombre: string;
  departamento_id: number;
}

export interface Distrito {
  id: number;
  nombre: string;
  provincia_id: number;
}

interface UseUbigeoOptions {
  departamentoId?: string;
  provinciaId?: string;
}

export function useUbigeo({ departamentoId, provinciaId }: UseUbigeoOptions = {}) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUbigeo = async () => {
      try {
        const [deptRes, provRes, distRes] = await Promise.all([
          api.get<Departamento[]>('/ubigeo/departamentos'),
          api.get<Provincia[]>('/ubigeo/provincias'),
          api.get<Distrito[]>('/ubigeo/distritos'),
        ]);
        setDepartamentos(deptRes);
        setProvincias(provRes);
        setDistritos(distRes);
      } catch (error) {
        console.error('Error fetching ubigeo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUbigeo();
  }, []);

  const provinciasFiltradas = departamentoId
    ? provincias.filter((p) => p.departamento_id === parseInt(departamentoId))
    : [];

  const distritosFiltrados = provinciaId
    ? distritos.filter((d) => d.provincia_id === parseInt(provinciaId))
    : [];

  return {
    departamentos,
    provincias,
    distritos,
    provinciasFiltradas,
    distritosFiltrados,
    loading,
  };
}
