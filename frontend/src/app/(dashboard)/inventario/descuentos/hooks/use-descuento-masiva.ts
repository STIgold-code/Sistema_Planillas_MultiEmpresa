"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  EmpleadoCandidatoDescuento,
  PaginatedResponse,
  DescuentoMasivaBody,
  ResultadoDescuentoMasivo,
  SolicitarTodosBody,
} from "@/types/inventario";

const LIMIT = 20;

export interface FiltrosCandidatosDescuento {
  buscar: string;
  soloNuevos: boolean;
  sede: string;
}

const FILTROS_INICIALES: FiltrosCandidatosDescuento = {
  buscar: "",
  soloNuevos: false,
  sede: "",
};

interface UseDescuentoMasivaArgs {
  /** Si está activo el panel; cuando es false no se dispara fetch. */
  activo: boolean;
}

export function useDescuentoMasiva({ activo }: UseDescuentoMasivaArgs) {
  const [candidatos, setCandidatos] = useState<EmpleadoCandidatoDescuento[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] =
    useState<FiltrosCandidatosDescuento>(FILTROS_INICIALES);
  const [buscarDebounced, setBuscarDebounced] = useState("");
  const [sedes, setSedes] = useState<{ id: number; nombre: string }[]>([]);

  const base = "/inventario/descuentos";

  useEffect(() => {
    const timer = setTimeout(
      () => setBuscarDebounced(filtros.buscar.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [filtros.buscar]);

  // Sedes activas (maestros) para el filtro combo.
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    api
      .get<{ data: { id: number; nombre: string }[] }>(
        "/sedes?limit=500&activo=true",
      )
      .then((res) => {
        if (vivo) setSedes(res.data);
      })
      .catch(() => {
        if (vivo) setSedes([]);
      });
    return () => {
      vivo = false;
    };
  }, [activo]);

  // Guard contra respuestas fuera de orden.
  const requestId = useRef(0);

  const fetchCandidatos = useCallback(async () => {
    if (!activo) return;
    const current = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (buscarDebounced) params.set("buscar", buscarDebounced);
      if (filtros.soloNuevos) params.set("solo_nuevos", "true");
      if (filtros.sede) params.set("sede", filtros.sede);

      const res = await api.get<PaginatedResponse<EmpleadoCandidatoDescuento>>(
        `${base}/candidatos?${params.toString()}`,
      );
      if (current !== requestId.current) return;
      setCandidatos(res.data);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (err) {
      if (current !== requestId.current) return;
      toast.error(getApiErrorMessage(err, "Error al cargar los empleados"));
      setCandidatos([]);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [activo, base, page, buscarDebounced, filtros.soloNuevos, filtros.sede]);

  useEffect(() => {
    fetchCandidatos();
  }, [fetchCandidatos]);

  const setFiltro = useCallback(
    <K extends keyof FiltrosCandidatosDescuento>(
      key: K,
      value: FiltrosCandidatosDescuento[K],
    ) => {
      setFiltros((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [],
  );

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
    setPage(1);
  }, []);

  const crearMasiva = useCallback(
    async (
      body: DescuentoMasivaBody,
    ): Promise<ResultadoDescuentoMasivo | null> => {
      setSaving(true);
      try {
        const res = await api.post<ResultadoDescuentoMasivo>(
          `${base}/masiva`,
          body,
        );
        return res;
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, "Error al solicitar los descuentos"),
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  /**
   * Solicita descuentos a TODOS los empleados que coinciden con el filtro
   * actual (sede / búsqueda / solo nuevos), en un único POST al backend.
   * El servidor filtra, omite a los que no tienen items descontables y retorna
   * el resumen de creadas/omitidas.
   */
  const solicitarTodos = useCallback(
    async (motivo: string): Promise<ResultadoDescuentoMasivo | null> => {
      setSaving(true);
      try {
        const body: SolicitarTodosBody = {
          motivo,
          filtros: {
            ...(buscarDebounced ? { buscar: buscarDebounced } : {}),
            // sede_id es number en este endpoint (no string).
            ...(filtros.sede ? { sede_id: Number(filtros.sede) } : {}),
            ...(filtros.soloNuevos ? { solo_nuevos: true } : {}),
          },
        };
        const res = await api.post<ResultadoDescuentoMasivo>(
          `${base}/solicitar-todos`,
          body,
        );
        return res;
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, "Error al solicitar los descuentos"),
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [base, buscarDebounced, filtros.soloNuevos, filtros.sede],
  );

  return {
    candidatos,
    sedes,
    loading,
    saving,
    page,
    setPage,
    totalPages,
    total,
    filtros,
    setFiltro,
    limpiarFiltros,
    crearMasiva,
    solicitarTodos,
  };
}
