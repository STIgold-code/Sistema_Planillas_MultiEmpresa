"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { SolicitudDescuento, PaginatedResponse } from "@/types/inventario";

export interface CrearDescuentoData {
  empleado_id: number;
  motivo: string;
  item_ids: number[];
}

export interface MontoItem {
  item_id: number;
  monto_descuento: number;
}

const ENDPOINT = "/inventario/descuentos";

export function useDescuentos() {
  const [descuentos, setDescuentos] = useState<SolicitudDescuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDescuentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<SolicitudDescuento>>(
        `${ENDPOINT}?limit=50`,
      );
      setDescuentos(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al cargar los descuentos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDescuentos();
  }, [fetchDescuentos]);

  const crear = async (data: CrearDescuentoData): Promise<boolean> => {
    setSaving(true);
    try {
      await api.post(ENDPOINT, data);
      toast.success("Solicitud de descuento creada");
      await fetchDescuentos();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al crear la solicitud"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const aprobar = async (
    id: number,
    montos: MontoItem[],
    observaciones?: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${ENDPOINT}/${id}/aprobar`, {
        montos,
        observaciones_admin: observaciones,
      });
      toast.success("Descuento aprobado");
      await fetchDescuentos();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al aprobar el descuento"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const rechazar = async (
    id: number,
    observaciones?: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${ENDPOINT}/${id}/rechazar`, {
        observaciones_admin: observaciones,
      });
      toast.success("Descuento rechazado");
      await fetchDescuentos();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al rechazar el descuento"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    descuentos,
    loading,
    saving,
    crear,
    aprobar,
    rechazar,
    refetch: fetchDescuentos,
  };
}
