"use client";

import { useMemo, useState, useCallback } from "react";
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
import { cn, formatDateSafe } from "@/lib/utils";
import type { EmpleadoCandidato, CargaLoteBody } from "@/types/inventario";
import { useCargaMasiva } from "../hooks/use-carga-masiva";

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resalta cada palabra del término dentro del texto (búsqueda por palabras). */
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
}

/** Estado de selección de un empleado: por tipo_uniforme_id, su prenda. */
type SeleccionEmpleado = Map<number, PrendaSeleccion>;

interface Props {
  requerimientoId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras guardar con éxito para refrescar el detalle. */
  onGuardado: () => Promise<void> | void;
}

/**
 * Estado inicial de selección de un empleado:
 * - Dotación "completa": todas las prendas marcadas con su talla sugerida.
 * - "Personalizar": nada marcado; el usuario elige en el panel de detalle.
 */
function estadoInicial(
  e: EmpleadoCandidato,
  completa: boolean,
): SeleccionEmpleado {
  const map: SeleccionEmpleado = new Map();
  for (const t of e.tallas) {
    map.set(t.tipo_uniforme_id, { incluida: completa, talla: t.talla });
  }
  return map;
}

export function CargaMasivaPanel({
  requerimientoId,
  open,
  onOpenChange,
  onGuardado,
}: Props) {
  const {
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
  } = useCargaMasiva({ requerimientoId, activo: open });

  // Selección por empleado_id. Persiste entre páginas mientras el panel esté abierto.
  const [seleccion, setSeleccion] = useState<Map<number, SeleccionEmpleado>>(
    () => new Map(),
  );
  // Dotación completa (todas las prendas) vs personalizar (elegir a mano).
  const [dotacionCompleta, setDotacionCompleta] = useState(true);
  // Empleado cuyo detalle de prendas se está editando en el panel lateral.
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Resetea todo el estado interno; se llama desde el handler de cierre,
  // no desde un efecto (evita el anti-patrón setState-in-effect).
  const resetEstado = useCallback(() => {
    setSeleccion(new Map());
    setEditandoId(null);
    setDotacionCompleta(true);
  }, []);

  const cerrar = useCallback(() => {
    resetEstado();
    onOpenChange(false);
  }, [resetEstado, onOpenChange]);

  const candidatoPorId = useMemo(() => {
    const m = new Map<number, EmpleadoCandidato>();
    for (const e of candidatos) m.set(e.id, e);
    return m;
  }, [candidatos]);

  const recibidoPorEmpleado = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const e of candidatos) {
      m.set(e.id, new Set(e.recibido.map((r) => r.tipo_uniforme_id)));
    }
    return m;
  }, [candidatos]);

  const fechaRecibido = (
    e: EmpleadoCandidato,
    tipoId: number,
  ): string | null => {
    const r = e.recibido.find((x) => x.tipo_uniforme_id === tipoId);
    return r ? formatDateSafe(r.fecha) : null;
  };

  const toggleEmpleado = (e: EmpleadoCandidato, marcar: boolean) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      if (marcar) next.set(e.id, estadoInicial(e, dotacionCompleta));
      else next.delete(e.id);
      return next;
    });
  };

  const togglePrenda = (
    e: EmpleadoCandidato,
    tipoId: number,
    incluida: boolean,
  ) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      const actual = next.get(e.id) ?? estadoInicial(e, false);
      const sel = new Map(actual);
      const prenda = sel.get(tipoId) ?? { incluida: false, talla: "" };
      sel.set(tipoId, { ...prenda, incluida });
      next.set(e.id, sel);
      return next;
    });
  };

  const updateTalla = (e: EmpleadoCandidato, tipoId: number, talla: string) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      const actual = next.get(e.id) ?? estadoInicial(e, false);
      const sel = new Map(actual);
      const prenda = sel.get(tipoId) ?? { incluida: false, talla: "" };
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

  // Contadores globales (toda la selección, no solo la página visible).
  const { totalEmpleados, totalPrendas, totalRepetidas } = useMemo(() => {
    let prendas = 0;
    let repetidas = 0;
    let empleados = 0;
    seleccion.forEach((sel, empId) => {
      const incluidasConTalla = [...sel.entries()].filter(
        ([, p]) => p.incluida && p.talla.trim(),
      );
      if (incluidasConTalla.length > 0) empleados++;
      const recibidos = recibidoPorEmpleado.get(empId);
      for (const [tipoId] of incluidasConTalla) {
        prendas++;
        if (recibidos?.has(tipoId)) repetidas++;
      }
    });
    return {
      totalEmpleados: empleados,
      totalPrendas: prendas,
      totalRepetidas: repetidas,
    };
  }, [seleccion, recibidoPorEmpleado]);

  const construirBody = (): CargaLoteBody => {
    const empleados: CargaLoteBody["empleados"] = [];
    seleccion.forEach((sel, empId) => {
      const candidato = candidatoPorId.get(empId);
      const lineas = [...sel.entries()]
        .filter(([, p]) => p.incluida && p.talla.trim())
        .map(([tipoId, p]) => {
          const tallaCfg = candidato?.tallas.find(
            (t) => t.tipo_uniforme_id === tipoId,
          );
          return {
            tipo_uniforme_id: tipoId,
            talla: p.talla.trim(),
            cantidad: tallaCfg?.cantidad_estandar ?? 1,
          };
        });
      if (lineas.length > 0) empleados.push({ empleado_id: empId, lineas });
    });
    return { empleados };
  };

  const handleGuardar = async () => {
    const body = construirBody();
    if (body.empleados.length === 0) return;
    const res = await guardarLote(body);
    if (!res) return;
    toast.success(
      `${res.empleados} empleado(s) y ${res.lineas} prenda(s) agregadas al requerimiento`,
    );
    await onGuardado();
    cerrar();
  };

  const handleAgregarTodos = async () => {
    const res = await agregarTodos();
    if (!res) return;
    toast.success(
      `${res.empleados} empleado(s) y ${res.lineas} prenda(s) agregadas al requerimiento`,
    );
    await onGuardado();
    cerrar();
  };

  const puedeGuardar = totalEmpleados > 0 && totalPrendas > 0 && !saving;
  const editando =
    editandoId != null ? candidatoPorId.get(editandoId) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) cerrar();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle>Agregar empleados al requerimiento</DialogTitle>
          <DialogDescription>
            Elige el alcance y la dotación; confirma la lista y ajusta casos
            puntuales en el panel. Solicita en lote — no entrega.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros + dotación */}
        <div className="border-b bg-muted/40 px-5 py-3 space-y-3">
          <div className="flex items-center gap-2">
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
                id="solo-nuevos"
                checked={filtros.soloNuevos}
                onCheckedChange={(v) => setFiltro("soloNuevos", v === true)}
              />
              <Label
                htmlFor="solo-nuevos"
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
                    const recibidoFecha = fechaRecibido(
                      editando,
                      t.tipo_uniforme_id,
                    );
                    const repetido = incluida && recibidoFecha !== null;
                    const tallasTipo = tallasPorTipo[t.tipo_uniforme_id] ?? [];
                    const sinTallas = tallasTipo.length === 0;
                    return (
                      <div
                        key={t.tipo_uniforme_id}
                        className={cn(
                          "flex flex-wrap items-center gap-2 rounded-md border bg-background px-2.5 py-1.5",
                          repetido && "border-amber-300 bg-amber-50",
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
                        {recibidoFecha && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[10px]",
                              repetido
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {repetido && <TriangleAlert className="h-3 w-3" />}
                            ya recibió {recibidoFecha}
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

        {/* Vista previa */}
        <div className="border-t bg-emerald-50 px-5 py-2 text-xs text-emerald-800">
          Se agregarán <b>{totalEmpleados}</b> empleado(s) ·{" "}
          <b>{totalPrendas}</b> prenda(s)
          {totalRepetidas > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5" />
              {totalRepetidas} ya entregadas antes
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
            <Button variant="outline" onClick={cerrar} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={handleAgregarTodos}
              disabled={saving || total === 0}
              title="Agrega la dotación estándar de todos los empleados del filtro"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar todos ({total})
            </Button>
            <Button onClick={handleGuardar} disabled={!puedeGuardar}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar seleccionados
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
