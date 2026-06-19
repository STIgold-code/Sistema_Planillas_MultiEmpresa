"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  EmpleadoCandidato,
  PaginatedResponse,
  CargaLoteBody,
  CargaLoteResultado,
} from "@/types/inventario";

const LIMIT = 20;

export interface FiltrosCandidatos {
  buscar: string;
  soloNuevos: boolean;
  sede: string;
}

const FILTROS_INICIALES: FiltrosCandidatos = {
  buscar: "",
  soloNuevos: false,
  sede: "",
};

interface UseCargaMasivaArgs {
  requerimientoId: number;
  /** Si está activo el panel; cuando es false no se dispara fetch. */
  activo: boolean;
}

export function useCargaMasiva({
  requerimientoId,
  activo,
}: UseCargaMasivaArgs) {
  const [candidatos, setCandidatos] = useState<EmpleadoCandidato[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosCandidatos>(FILTROS_INICIALES);
  // Debounce del término de búsqueda para no disparar fetch en cada tecla.
  const [buscarDebounced, setBuscarDebounced] = useState("");
  // Sedes (maestros) para el filtro combo.
  const [sedes, setSedes] = useState<{ id: number; nombre: string }[]>([]);
  // Catálogo de tallas válidas por tipo de uniforme (para los combos de talla).
  const [tallasPorTipo, setTallasPorTipo] = useState<Record<number, string[]>>(
    {},
  );

  const base = `/inventario/requerimientos/${requerimientoId}`;

  useEffect(() => {
    const timer = setTimeout(
      () => setBuscarDebounced(filtros.buscar.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [filtros.buscar]);

  // Carga las sedes activas (maestros) una vez al abrir el panel.
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

  // Carga el catálogo de tallas por tipo de uniforme (maestros) al abrir.
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    api
      .get<{ id: number; tallas: { valor: string }[] }[]>(
        "/tipos-uniforme/select",
      )
      .then((res) => {
        if (!vivo) return;
        const mapa: Record<number, string[]> = {};
        for (const t of res) mapa[t.id] = t.tallas.map((x) => x.valor);
        setTallasPorTipo(mapa);
      })
      .catch(() => {
        if (vivo) setTallasPorTipo({});
      });
    return () => {
      vivo = false;
    };
  }, [activo]);

  // Guard contra respuestas fuera de orden: solo aplica el último request vigente.
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

      const res = await api.get<PaginatedResponse<EmpleadoCandidato>>(
        `${base}/empleados-candidatos?${params.toString()}`,
      );
      if (current !== requestId.current) return;
      setCandidatos(res.data);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch {
      if (current !== requestId.current) return;
      toast.error("Error al cargar los empleados disponibles");
      setCandidatos([]);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [activo, base, page, buscarDebounced, filtros.soloNuevos, filtros.sede]);

  useEffect(() => {
    fetchCandidatos();
  }, [fetchCandidatos]);

  // Al cambiar cualquier filtro volvemos a la primera página.
  const setFiltro = useCallback(
    <K extends keyof FiltrosCandidatos>(
      key: K,
      value: FiltrosCandidatos[K],
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

  /**
   * Agrega al requerimiento la dotación estándar de TODOS los empleados que
   * matchean el filtro actual (sede / búsqueda / solo nuevos), de un saque.
   * Solicita en lote — no asigna ni entrega.
   */
  const agregarTodos = useCallback(async (): Promise<{
    empleados: number;
    lineas: number;
  } | null> => {
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (buscarDebounced) params.set("buscar", buscarDebounced);
      if (filtros.soloNuevos) params.set("solo_nuevos", "true");
      if (filtros.sede) params.set("sede", filtros.sede);
      const qs = params.toString();
      const res = await api.post<{ empleados: number; lineas: number }>(
        `${base}/agregar-todos${qs ? `?${qs}` : ""}`,
        {},
      );
      return res;
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Error al agregar a todos los empleados"),
      );
      return null;
    } finally {
      setSaving(false);
    }
  }, [base, buscarDebounced, filtros.soloNuevos, filtros.sede]);

  const guardarLote = useCallback(
    async (body: CargaLoteBody): Promise<CargaLoteResultado | null> => {
      setSaving(true);
      try {
        const res = await api.put<CargaLoteResultado>(
          `${base}/empleados-lote`,
          body,
        );
        return res;
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, "Error al guardar el lote de empleados"),
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  return {
    candidatos,
    sedes,
    tallasPorTipo,
    loading,
    saving,
    page,
    setPage,
    totalPages,
    total,
    filtros,
    setFiltro,
    limpiarFiltros,
    guardarLote,
    agregarTodos,
    refetch: fetchCandidatos,
  };
}
