"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  IngresoInventario,
  IngresoInventarioFull,
  PaginatedResponse,
} from "@/types/inventario";

export interface LineaIngreso {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CrearIngresoData {
  proveedor_id: number;
  fecha_ingreso: string;
  numero_documento?: string;
  observaciones?: string;
  lineas: LineaIngreso[];
}

const ENDPOINT = "/inventario/ingresos";

export function useIngresos() {
  const [ingresos, setIngresos] = useState<IngresoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchIngresos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<IngresoInventario>>(
        `${ENDPOINT}?limit=50`,
      );
      setIngresos(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al cargar los ingresos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngresos();
  }, [fetchIngresos]);

  const crear = async (data: CrearIngresoData): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.post<{ total_items: number }>(ENDPOINT, data);
      toast.success(`Compra registrada: ${res.total_items} items creados`);
      await fetchIngresos();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al registrar la compra"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const fetchDetalle = async (
    id: number,
  ): Promise<IngresoInventarioFull | null> => {
    try {
      return await api.get<IngresoInventarioFull>(`${ENDPOINT}/${id}`);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Error al cargar el detalle del ingreso"),
      );
      return null;
    }
  };

  return {
    ingresos,
    loading,
    saving,
    crear,
    fetchDetalle,
    refrescar: fetchIngresos,
  };
}
