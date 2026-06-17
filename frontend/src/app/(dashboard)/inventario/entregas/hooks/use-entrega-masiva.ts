"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  EmpleadoCandidatoEntrega,
  DisponibilidadStock,
  PaginatedResponse,
  EntregaMasivaBody,
  ResultadoEntregaMasiva,
  EntregarTodosBody,
} from "@/types/inventario";

const LIMIT = 20;

export interface FiltrosCandidatosEntrega {
  buscar: string;
  soloNuevos: boolean;
  sede: string;
}

const FILTROS_INICIALES: FiltrosCandidatosEntrega = {
  buscar: "",
  soloNuevos: false,
  sede: "",
};

interface UseEntregaMasivaArgs {
  /** Si está activo el panel; cuando es false no se dispara fetch. */
  activo: boolean;
}

/** Catálogo de tallas válidas por tipo de uniforme. */
type TallasPorTipo = Record<number, string[]>;
/** Stock disponible: clave "tipoId|talla" -> cantidad disponible. */
type StockPorClave = Map<string, number>;

export const claveStock = (tipoId: number, talla: string): string =>
  `${tipoId}|${talla.trim().toUpperCase()}`;

export function useEntregaMasiva({ activo }: UseEntregaMasivaArgs) {
  const [candidatos, setCandidatos] = useState<EmpleadoCandidatoEntrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] =
    useState<FiltrosCandidatosEntrega>(FILTROS_INICIALES);
  const [buscarDebounced, setBuscarDebounced] = useState("");
  const [sedes, setSedes] = useState<{ id: number; nombre: string }[]>([]);
  const [tallasPorTipo, setTallasPorTipo] = useState<TallasPorTipo>({});
  // Stock disponible por prenda + talla (validación del reparto).
  const [stock, setStock] = useState<StockPorClave>(() => new Map());

  const base = "/inventario/entregas";

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

  // Catálogo de tallas por tipo de uniforme (maestros).
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    api
      .get<{ id: number; tallas: { valor: string }[] }[]>(
        "/tipos-uniforme/select",
      )
      .then((res) => {
        if (!vivo) return;
        const mapa: TallasPorTipo = {};
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

  // Carga el stock disponible al abrir el panel (validación de reparto).
  const fetchStock = useCallback(async () => {
    try {
      const res = await api.get<DisponibilidadStock[]>(
        `${base}/disponibilidad`,
      );
      const mapa: StockPorClave = new Map();
      for (const s of res)
        mapa.set(claveStock(s.tipo_uniforme_id, s.talla), s.disponibles);
      setStock(mapa);
    } catch {
      setStock(new Map());
    }
  }, [base]);

  useEffect(() => {
    if (!activo) return;
    fetchStock();
  }, [activo, fetchStock]);

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

      const res = await api.get<PaginatedResponse<EmpleadoCandidatoEntrega>>(
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
    <K extends keyof FiltrosCandidatosEntrega>(
      key: K,
      value: FiltrosCandidatosEntrega[K],
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

  const entregarMasiva = useCallback(
    async (body: EntregaMasivaBody): Promise<ResultadoEntregaMasiva | null> => {
      setSaving(true);
      try {
        const res = await api.post<ResultadoEntregaMasiva>(
          `${base}/masiva`,
          body,
        );
        return res;
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Error al entregar la dotación"));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [base],
  );

  /**
   * Entrega la dotación estándar de TODOS los empleados que coinciden con el
   * filtro actual (sede / búsqueda / solo nuevos), en un único POST al backend.
   * El servidor aplica los filtros, arma la dotación y descuenta del stock.
   */
  const entregarTodos = useCallback(
    async (
      fecha: string,
      dotacionCompleta: boolean,
      observaciones?: string,
    ): Promise<ResultadoEntregaMasiva | null> => {
      setSaving(true);
      try {
        const body: EntregarTodosBody = {
          fecha,
          dotacion_completa: dotacionCompleta,
          filtros: {
            ...(buscarDebounced ? { buscar: buscarDebounced } : {}),
            ...(filtros.sede ? { sede_id: Number(filtros.sede) } : {}),
            ...(filtros.soloNuevos ? { solo_nuevos: true } : {}),
          },
          ...(observaciones ? { observaciones } : {}),
        };
        const res = await api.post<ResultadoEntregaMasiva>(
          `${base}/entregar-todos`,
          body,
        );
        return res;
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Error al entregar a todos"));
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
    tallasPorTipo,
    stock,
    loading,
    saving,
    page,
    setPage,
    totalPages,
    total,
    filtros,
    setFiltro,
    limpiarFiltros,
    entregarMasiva,
    entregarTodos,
    refetchStock: fetchStock,
  };
}
