'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type {
  TipoUniformeSelect,
  ProveedorSelect,
} from '@/types/inventario';

/**
 * Carga los catálogos para selects (tipos de uniforme y proveedores activos).
 * Reusado por el formulario de ingreso y los filtros de stock.
 */
export function useInventarioSelects() {
  const [tipos, setTipos] = useState<TipoUniformeSelect[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorSelect[]>([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [tiposRes, provRes] = await Promise.all([
          api.get<TipoUniformeSelect[]>('/tipos-uniforme/select'),
          api.get<ProveedorSelect[]>('/proveedores/select'),
        ]);
        if (activo) {
          setTipos(tiposRes);
          setProveedores(provRes);
        }
      } catch {
        // silencioso; los selects quedarán vacíos
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return { tipos, proveedores };
}
