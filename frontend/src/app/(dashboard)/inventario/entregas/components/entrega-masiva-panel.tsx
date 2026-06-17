"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Loader2,
  Search,
  Users,
  Shirt,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  X,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn, toDateString } from "@/lib/utils";
import type {
  EmpleadoCandidatoEntrega,
  EntregaMasivaBody,
  ResultadoEntregaMasiva,
} from "@/types/inventario";
import { useEntregaMasiva, claveStock } from "../hooks/use-entrega-masiva";

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resalta cada palabra del término dentro del texto. */
function resaltar(texto: string, termino: string): React.ReactNode {
  const palabras = termino.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return texto;
  const re = new RegExp(`(${palabras.map(escaparRegex).join("|")})`, "gi");
  return texto.split(re).map((parte, i) =>
    palabras.some((p) => p.toLowerCase() === parte.toLowerCase()) ? (
      <mark key={i} className="bg-amber-200 rounded-sm px-0.5">
        {parte}
      </mark>
    ) : (
      parte
    ),
  );
}

interface PrendaSeleccion {
  incluida: boolean;
  talla: string;
  cantidad: number;
}

/** Estado de selección de un empleado: por tipo_uniforme_id, su prenda. */
type SeleccionEmpleado = Map<number, PrendaSeleccion>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras entregar con éxito para refrescar la lista de entregas. */
  onEntregado: () => Promise<void> | void;
}

/**
 * Estado inicial de selección de un empleado:
 * - Dotación "completa": todas las prendas con talla marcadas, cantidad estándar.
 * - "Personalizar": nada marcado; el usuario elige en el panel de detalle.
 */
function estadoInicial(
  e: EmpleadoCandidatoEntrega,
  completa: boolean,
): SeleccionEmpleado {
  const map: SeleccionEmpleado = new Map();
  for (const t of e.tallas) {
    map.set(t.tipo_uniforme_id, {
      // Solo se premarca si hay talla guardada (sin talla no se puede entregar).
      incluida: completa && t.talla.trim() !== "",
      talla: t.talla,
      cantidad: t.cantidad_estandar > 0 ? t.cantidad_estandar : 1,
    });
  }
  return map;
}

export function EntregaMasivaPanel({ open, onOpenChange, onEntregado }: Props) {
  const {
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
    refetchStock,
  } = useEntregaMasiva({ activo: open });

  const [seleccion, setSeleccion] = useState<Map<number, SeleccionEmpleado>>(
    () => new Map(),
  );
  const [dotacionCompleta, setDotacionCompleta] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => toDateString(new Date()));

  // Reinicia el estado al cerrar el panel.
  useEffect(() => {
    if (!open) {
      setSeleccion(new Map());
      setEditandoId(null);
      setDotacionCompleta(true);
      setFecha(toDateString(new Date()));
    }
  }, [open]);

  const candidatoPorId = useMemo(() => {
    const m = new Map<number, EmpleadoCandidatoEntrega>();
    for (const e of candidatos) m.set(e.id, e);
    return m;
  }, [candidatos]);

  const toggleEmpleado = (e: EmpleadoCandidatoEntrega, marcar: boolean) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      if (marcar) next.set(e.id, estadoInicial(e, dotacionCompleta));
      else next.delete(e.id);
      return next;
    });
  };

  const togglePrenda = (
    e: EmpleadoCandidatoEntrega,
    tipoId: number,
    incluida: boolean,
  ) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      const actual = next.get(e.id) ?? estadoInicial(e, false);
      const sel = new Map(actual);
      const prenda = sel.get(tipoId) ?? {
        incluida: false,
        talla: "",
        cantidad: 1,
      };
      sel.set(tipoId, { ...prenda, incluida });
      next.set(e.id, sel);
      return next;
    });
  };

  const updateTalla = (
    e: EmpleadoCandidatoEntrega,
    tipoId: number,
    talla: string,
  ) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      const actual = next.get(e.id) ?? estadoInicial(e, false);
      const sel = new Map(actual);
      const prenda = sel.get(tipoId) ?? {
        incluida: false,
        talla: "",
        cantidad: 1,
      };
      sel.set(tipoId, { ...prenda, talla });
      next.set(e.id, sel);
      return next;
    });
  };

  // Empleados de la página actual marcados (para el "seleccionar todos").
  const visiblesMarcados = candidatos.filter((e) => seleccion.has(e.id)).length;
  const todosVisiblesMarcados =
    candidatos.length > 0 && visiblesMarcados === candidatos.length;
  const algunoVisibleMarcado = visiblesMarcados > 0;

  const toggleTodos = (marcar: boolean) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      for (const e of candidatos) {
        if (marcar) next.set(e.id, estadoInicial(e, dotacionCompleta));
        else next.delete(e.id);
      }
      return next;
    });
  };

  // Cuenta de prendas marcadas (con talla) de un empleado.
  const prendasContadas = (empId: number): number => {
    const sel = seleccion.get(empId);
    if (!sel) return 0;
    return [...sel.values()].filter((p) => p.incluida && p.talla.trim()).length;
  };

  // Demanda agregada por prenda + talla en TODA la selección (no solo la página
  // visible). Es lo que cruzamos contra el stock disponible: varios empleados
  // pueden pedir la misma talla y, sumados, superar el stock real.
  const demandaPorClave = useMemo(() => {
    const m = new Map<string, number>();
    seleccion.forEach((sel) => {
      for (const [tipoId, p] of sel.entries()) {
        if (!p.incluida || !p.talla.trim() || p.cantidad < 1) continue;
        const clave = claveStock(tipoId, p.talla);
        m.set(clave, (m.get(clave) ?? 0) + p.cantidad);
      }
    });
    return m;
  }, [seleccion]);

  // Faltantes globales: por cada clave con demanda > stock, cuánto falta.
  const faltantesGlobales = useMemo(() => {
    const filas: { clave: string; demanda: number; disponible: number }[] = [];
    demandaPorClave.forEach((demanda, clave) => {
      const disponible = stock.get(clave) ?? 0;
      if (demanda > disponible) filas.push({ clave, demanda, disponible });
    });
    return filas;
  }, [demandaPorClave, stock]);

  const hayFaltantes = faltantesGlobales.length > 0;

  // Contadores globales.
  const { totalEmpleados, totalPrendas } = useMemo(() => {
    let prendas = 0;
    let empleados = 0;
    seleccion.forEach((sel) => {
      const incluidasConTalla = [...sel.values()].filter(
        (p) => p.incluida && p.talla.trim() && p.cantidad >= 1,
      );
      if (incluidasConTalla.length > 0) empleados++;
      for (const p of incluidasConTalla) prendas += p.cantidad;
    });
    return { totalEmpleados: empleados, totalPrendas: prendas };
  }, [seleccion]);

  const construirBody = (): EntregaMasivaBody => {
    const empleados: EntregaMasivaBody["empleados"] = [];
    seleccion.forEach((sel, empId) => {
      const lineas = [...sel.entries()]
        .filter(([, p]) => p.incluida && p.talla.trim() && p.cantidad >= 1)
        .map(([tipoId, p]) => ({
          tipo_uniforme_id: tipoId,
          talla: p.talla.trim(),
          cantidad: p.cantidad,
        }));
      if (lineas.length > 0) empleados.push({ empleado_id: empId, lineas });
    });
    return {
      fecha_entrega: fecha,
      empleados,
    };
  };

  const notificarResultado = (res: ResultadoEntregaMasiva) => {
    if (res.total_faltante > 0) {
      toast.warning(
        `Se entregaron ${res.total_entregado} prenda(s) a ${res.empleados_con_entrega} empleado(s). ` +
          `Faltó stock para ${res.total_faltante} prenda(s).`,
      );
    } else {
      toast.success(
        `Se entregaron ${res.total_entregado} prenda(s) a ${res.empleados_con_entrega} empleado(s).`,
      );
    }
  };

  const handleEntregar = async () => {
    const body = construirBody();
    if (body.empleados.length === 0) return;
    const res = await entregarMasiva(body);
    if (!res) return;
    notificarResultado(res);
    await refetchStock();
    await onEntregado();
    onOpenChange(false);
  };

  const handleEntregarTodos = async () => {
    const res = await entregarTodos(fecha, dotacionCompleta);
    if (!res) return;
    notificarResultado(res);
    await refetchStock();
    await onEntregado();
    onOpenChange(false);
  };

  const puedeEntregar =
    totalEmpleados > 0 && totalPrendas > 0 && !!fecha && !saving;
  const editando =
    editandoId != null ? candidatoPorId.get(editandoId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle>Entrega masiva de dotación</DialogTitle>
          <DialogDescription>
            Elige los empleados y su dotación; el sistema descuenta del stock
            disponible. Lo que no alcance se reporta como faltante.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros + dotación + fecha */}
        <div className="border-b bg-muted/40 px-5 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Dotación:
            </span>
            <div className="inline-flex overflow-hidden rounded-md border bg-background">
              <button
                type="button"
                aria-pressed={dotacionCompleta}
                onClick={() => setDotacionCompleta(true)}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  dotacionCompleta
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                Completa (estándar)
              </button>
              <button
                type="button"
                aria-pressed={!dotacionCompleta}
                onClick={() => setDotacionCompleta(false)}
                className={cn(
                  "border-l px-3 py-1.5 text-sm",
                  !dotacionCompleta
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                Personalizar
              </button>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {dotacionCompleta
                ? "Al seleccionar, se marcan todas las prendas con su talla."
                : "Al seleccionar, eliges las prendas en el panel de detalle."}
            </span>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Label
                htmlFor="fecha-entrega-masiva"
                className="text-xs text-muted-foreground"
              >
                Fecha
              </Label>
              <Input
                id="fecha-entrega-masiva"
                type="date"
                min="2020-01-01"
                max={toDateString(new Date())}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-9 w-40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-xs text-muted-foreground">
                Buscar (nombre, DNI o cargo)
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 pr-9 h-9"
                  placeholder="Ej: perez juan"
                  value={filtros.buscar}
                  onChange={(e) => setFiltro("buscar", e.target.value)}
                />
                {filtros.buscar && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setFiltro("buscar", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2 sm:pb-1.5">
              <Checkbox
                id="solo-nuevos-entrega"
                checked={filtros.soloNuevos}
                onCheckedChange={(v) => setFiltro("soloNuevos", v === true)}
              />
              <Label
                htmlFor="solo-nuevos-entrega"
                className="text-sm font-normal cursor-pointer"
              >
                Solo nuevos
              </Label>
            </div>
            <div className="min-w-[160px] space-y-1">
              <Label className="text-xs text-muted-foreground">Sede</Label>
              <Select
                value={filtros.sede || "TODAS"}
                onValueChange={(v) => setFiltro("sede", v === "TODAS" ? "" : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {sedes.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={limpiarFiltros}
            >
              Limpiar
            </Button>
          </div>
        </div>

        {/* Barra de selección masiva */}
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-5 py-2 text-sm">
          <Checkbox
            aria-label="Seleccionar todos los visibles"
            checked={
              todosVisiblesMarcados
                ? true
                : algunoVisibleMarcado
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => toggleTodos(v === true)}
          />
          <span className="text-muted-foreground">
            {loading
              ? "Buscando…"
              : `${total} empleado${total === 1 ? "" : "s"} · ${visiblesMarcados} marcados en esta página`}
          </span>
        </div>

        {/* Lista compacta + panel de detalle */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Lista */}
          <div className="col-span-12 sm:col-span-7 border-r overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : candidatos.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Sin empleados para ese filtro.
              </div>
            ) : (
              <ul className="divide-y">
                {candidatos.map((e) => {
                  const marcado = seleccion.has(e.id);
                  const n = prendasContadas(e.id);
                  const sinPrendas = e.tallas.length === 0;
                  return (
                    <li
                      key={e.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-2.5",
                        marcado ? "bg-primary/5" : "hover:bg-muted/40",
                        editandoId === e.id &&
                          "ring-1 ring-inset ring-primary/40",
                      )}
                    >
                      <Checkbox
                        aria-label={`Seleccionar ${e.apellido_paterno}`}
                        checked={marcado}
                        onCheckedChange={(v) => toggleEmpleado(e, v === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {resaltar(
                            `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
                            filtros.buscar,
                          )}
                          {e.estado !== "ACTIVO" && (
                            <span className="ml-1.5 rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[10px] text-amber-700">
                              {e.estado.charAt(0) +
                                e.estado.slice(1).toLowerCase()}
                            </span>
                          )}
                          {e.es_nuevo && (
                            <span className="ml-1.5 rounded border border-green-200 bg-green-100 px-1 py-0 text-[10px] text-green-700">
                              Nuevo
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                          {e.numero_documento}
                          {e.sede ? ` · ${e.sede}` : ""}
                          {e.cargo ? ` · ${e.cargo}` : ""}
                        </p>
                      </div>
                      {sinPrendas ? (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-500 border-slate-200 text-xs"
                        >
                          sin prendas
                        </Badge>
                      ) : marcado && n > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                        >
                          {n} prenda{n === 1 ? "" : "s"}
                        </Badge>
                      ) : marcado ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-100 text-amber-700 border-amber-200 text-xs"
                        >
                          elige prendas
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-500 border-slate-200 text-xs"
                        >
                          sin marcar
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditandoId(e.id)}
                        disabled={sinPrendas}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t px-5 py-2 text-xs text-muted-foreground">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Panel de detalle de un empleado */}
          <div className="col-span-12 sm:col-span-5 bg-muted/20 overflow-y-auto">
            {editando ? (
              <>
                <div className="flex items-center justify-between border-b bg-background/60 px-4 py-2.5">
                  <span className="truncate text-sm font-semibold">
                    {editando.apellido_paterno} {editando.apellido_materno},{" "}
                    {editando.nombres}
                  </span>
                  <button
                    type="button"
                    aria-label="Cerrar detalle"
                    onClick={() => setEditandoId(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1.5 p-4">
                  {editando.tallas.map((t) => {
                    const sel = seleccion.get(editando.id);
                    const prenda = sel?.get(t.tipo_uniforme_id);
                    const incluida = prenda?.incluida ?? false;
                    const valorTalla = prenda?.talla ?? t.talla;
                    const cantidad = prenda?.cantidad ?? t.cantidad_estandar;
                    const tallasTipo = tallasPorTipo[t.tipo_uniforme_id] ?? [];
                    const sinTallas = tallasTipo.length === 0;
                    const disponible = valorTalla
                      ? (stock.get(
                          claveStock(t.tipo_uniforme_id, valorTalla),
                        ) ?? 0)
                      : null;
                    const sinStock =
                      incluida &&
                      valorTalla.trim() !== "" &&
                      (disponible ?? 0) < cantidad;
                    return (
                      <div
                        key={t.tipo_uniforme_id}
                        className={cn(
                          "flex flex-wrap items-center gap-2 rounded-md border bg-background px-2.5 py-1.5",
                          sinStock && "border-amber-300 bg-amber-50",
                        )}
                      >
                        <Checkbox
                          aria-label={`Incluir ${t.tipo_nombre}`}
                          checked={incluida}
                          onCheckedChange={(v) =>
                            togglePrenda(
                              editando,
                              t.tipo_uniforme_id,
                              v === true,
                            )
                          }
                        />
                        <span className="flex-1 text-sm">{t.tipo_nombre}</span>
                        <Select
                          value={valorTalla || ""}
                          disabled={!incluida || sinTallas}
                          onValueChange={(v) =>
                            updateTalla(editando, t.tipo_uniforme_id, v)
                          }
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue
                              placeholder={sinTallas ? "Sin tallas" : "Talla"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {tallasTipo.map((tv) => (
                              <SelectItem key={tv} value={tv}>
                                {tv}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {valorTalla && incluida && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[10px]",
                              sinStock
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {sinStock && <TriangleAlert className="h-3 w-3" />}
                            stock: {disponible ?? 0}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Elige &quot;Editar&quot; en un empleado para ajustar sus
                prendas. Con dotación completa ya vienen marcadas.
              </div>
            )}
          </div>
        </div>

        {/* Vista previa + aviso de stock */}
        <div
          className={cn(
            "border-t px-5 py-2 text-xs",
            hayFaltantes
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-800",
          )}
        >
          {hayFaltantes ? (
            <span className="inline-flex items-center gap-1">
              <TriangleAlert className="h-3.5 w-3.5" />
              Stock insuficiente en {faltantesGlobales.length} talla(s): se
              entregará lo disponible y el resto quedará pendiente.
            </span>
          ) : (
            <span>
              Se entregarán <b>{totalPrendas}</b> prenda(s) a{" "}
              <b>{totalEmpleados}</b> empleado(s). Hay stock para todo.
            </span>
          )}
        </div>

        {/* Footer: acciones */}
        <div className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1.5">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-primary">{totalEmpleados}</span>
            empleado(s)
            <span className="text-muted-foreground/50">·</span>
            <Shirt className="h-4 w-4" />
            <span className="font-semibold text-foreground">
              {totalPrendas}
            </span>
            prenda(s)
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={handleEntregarTodos}
              disabled={saving || total === 0 || !fecha}
              title="Entrega la dotación estándar de todos los empleados del filtro"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entregar a todos ({total})
            </Button>
            <Button onClick={handleEntregar} disabled={!puedeEntregar}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entregar seleccionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
