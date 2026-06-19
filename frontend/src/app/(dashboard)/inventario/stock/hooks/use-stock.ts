"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  ItemInventario,
  ItemInventarioDetalle,
  ResumenStock,
  EstadoItemInventario,
  PaginatedResponse,
} from "@/types/inventario";

export interface StockFilters {
  buscar: string;
  estado: EstadoItemInventario | "TODOS";
  tipo_uniforme_id: number | "TODOS";
}

const ENDPOINT = "/inventario/items";

export function useStock() {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [resumen, setResumen] = useState<ResumenStock>({
    DISPONIBLE: 0,
    ENTREGADO: 0,
    BAJA: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>({
    buscar: "",
    estado: "TODOS",
    tipo_uniforme_id: "TODOS",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filters.buscar.trim()) params.set("buscar", filters.buscar.trim());
      if (filters.estado !== "TODOS") params.set("estado", filters.estado);
      if (filters.tipo_uniforme_id !== "TODOS") {
        params.set("tipo_uniforme_id", String(filters.tipo_uniforme_id));
      }
      const res = await api.get<PaginatedResponse<ItemInventario>>(
        `${ENDPOINT}?${params.toString()}`,
      );
      setItems(res.data);
    } catch {
      toast.error("Error al cargar el stock");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchResumen = useCallback(async () => {
    try {
      const res = await api.get<ResumenStock>(`${ENDPOINT}/resumen`);
      setResumen(res);
    } catch {
      // resumen no crítico; silencioso
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchItems, filters.buscar ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchItems, filters.buscar]);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  const fetchDetalle = async (
    id: number,
  ): Promise<ItemInventarioDetalle | null> => {
    try {
      return await api.get<ItemInventarioDetalle>(`${ENDPOINT}/${id}`);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Error al cargar el detalle del ítem"),
      );
      return null;
    }
  };

  return {
    items,
    resumen,
    loading,
    filters,
    setFilters,
    fetchDetalle,
    refetch: () => Promise.all([fetchItems(), fetchResumen()]),
  };
}
