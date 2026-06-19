"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { Requerimiento } from "@/types/inventario";

const ENDPOINT = "/inventario/requerimientos";

interface RequerimientosPage {
  data: Requerimiento[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useRequerimientos() {
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRequerimientos = useCallback(async () => {
    setLoading(true);
    try {
      // limit=200 para traer todos en una página y mantener filtros locales.
      // Si el volumen crece se puede migrar a paginación server-side.
      const res = await api.get<RequerimientosPage>(
        `${ENDPOINT}?page=1&limit=200`,
      );
      setRequerimientos(res.data);
    } catch {
      toast.error("Error al cargar los requerimientos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequerimientos();
  }, [fetchRequerimientos]);

  const crear = async (
    nombre: string,
    fecha: string,
    proveedor_id?: number,
  ): Promise<Requerimiento | null> => {
    setSaving(true);
    try {
      const res = await api.post<Requerimiento>(ENDPOINT, {
        nombre,
        fecha,
        ...(proveedor_id ? { proveedor_id } : {}),
      });
      toast.success("Requerimiento creado");
      await fetchRequerimientos();
      return res;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al crear el requerimiento"));
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { requerimientos, loading, saving, crear };
}
