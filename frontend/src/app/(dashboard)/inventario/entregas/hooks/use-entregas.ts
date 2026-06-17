"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { EntregaUniforme, PaginatedResponse } from "@/types/inventario";

export interface LineaEntrega {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

export interface CrearEntregaData {
  empleado_id: number;
  fecha_entrega: string;
  observaciones?: string;
  lineas: LineaEntrega[];
}

const ENDPOINT = "/inventario/entregas";

export function useEntregas() {
  const [entregas, setEntregas] = useState<EntregaUniforme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEntregas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<EntregaUniforme>>(
        `${ENDPOINT}?limit=50`,
      );
      setEntregas(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al cargar las entregas"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntregas();
  }, [fetchEntregas]);

  const crear = async (data: CrearEntregaData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, data);
      toast.success("Entrega registrada");
      await fetchEntregas();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al entregar"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const devolver = async (
    itemIds: number[],
    condicion: "BUENA" | "DANADA" = "BUENA",
    motivo?: string,
  ): Promise<boolean> => {
    try {
      await api.post("/inventario/devoluciones", {
        item_ids: itemIds,
        condicion,
        motivo,
      });
      toast.success(
        condicion === "DANADA"
          ? "Items dados de baja"
          : "Devolución registrada (vuelven al stock como usados)",
      );
      await fetchEntregas();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al devolver"));
      return false;
    }
  };

  const fetchDetalle = async (id: number): Promise<EntregaUniforme | null> => {
    try {
      return await api.get<EntregaUniforme>(`${ENDPOINT}/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al cargar el detalle"));
      return null;
    }
  };

  return {
    entregas,
    loading,
    saving,
    crear,
    devolver,
    fetchDetalle,
    refetch: fetchEntregas,
  };
}
