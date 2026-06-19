"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  RequerimientoFull,
  ConsolidadoRequerimiento,
  TallaEmpleadoPrellenada,
  PlanificacionCompraLinea,
  LineaItem,
} from "@/types/inventario";

export interface LineaEmpleado {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

export function useRequerimientoDetalle(id: number) {
  const [requerimiento, setRequerimiento] = useState<RequerimientoFull | null>(
    null,
  );
  const [consolidado, setConsolidado] = useState<ConsolidadoRequerimiento[]>(
    [],
  );
  const [planificacion, setPlanificacion] = useState<
    PlanificacionCompraLinea[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const base = `/inventario/requerimientos/${id}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [req, cons, plan] = await Promise.all([
        api.get<RequerimientoFull>(base),
        api.get<ConsolidadoRequerimiento[]>(`${base}/consolidado`),
        api.get<PlanificacionCompraLinea[]>(`${base}/planificacion`),
      ]);
      setRequerimiento(req);
      setConsolidado(cons);
      setPlanificacion(plan);
    } catch {
      toast.error("Error al cargar el requerimiento");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tallasEmpleado = async (
    empleadoId: number,
  ): Promise<TallaEmpleadoPrellenada[]> => {
    try {
      return await api.get<TallaEmpleadoPrellenada[]>(
        `${base}/tallas-empleado/${empleadoId}`,
      );
    } catch {
      toast.error("Error al cargar las tallas del empleado");
      return [];
    }
  };

  const guardarEmpleado = async (
    empleadoId: number,
    lineas: LineaEmpleado[],
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put(`${base}/empleado`, { empleado_id: empleadoId, lineas });
      toast.success("Empleado guardado en el requerimiento");
      await fetchData();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al guardar el empleado"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Guarda los ítems directos (lista de compra sin empleados). Reemplaza solo
   * las líneas sin empleado; no toca las cargadas por el asistente de empleados.
   */
  const guardarItems = async (lineas: LineaItem[]): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put(`${base}/items`, { lineas });
      toast.success("Ítems guardados en el requerimiento");
      await fetchData();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al guardar los ítems"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Asigna o cambia el proveedor (destinatario del cargo) en un borrador. */
  const asignarProveedor = async (proveedorId: number): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${base}/proveedor`, { proveedor_id: proveedorId });
      toast.success("Proveedor asignado al requerimiento");
      await fetchData();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo asignar el proveedor"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const accionEstado = async (
    accion: "aprobar" | "rechazar" | "finalizar",
    okMsg: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await api.patch(`${base}/${accion}`, {});
      toast.success(okMsg);
      await fetchData();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo completar la acción"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const aprobar = () => accionEstado("aprobar", "Requerimiento aprobado");
  const rechazar = () =>
    accionEstado("rechazar", "Requerimiento devuelto a borrador");
  const finalizar = () => accionEstado("finalizar", "Requerimiento finalizado");

  return {
    requerimiento,
    consolidado,
    planificacion,
    loading,
    saving,
    tallasEmpleado,
    guardarEmpleado,
    guardarItems,
    asignarProveedor,
    aprobar,
    rechazar,
    finalizar,
    refrescar: fetchData,
  };
}
