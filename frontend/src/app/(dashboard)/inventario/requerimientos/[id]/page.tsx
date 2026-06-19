"use client";

import { useState, useMemo } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  FileSpreadsheet,
  FileText,
  Check,
  Users,
  UserPlus,
  ShoppingCart,
  Undo2,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { hasPermission } from "@/lib/auth";
import { useUser } from "@/contexts/user-context";
import { formatDateSafe, formatDateTimeSafe } from "@/lib/utils";
import { useRequerimientoDetalle } from "./hooks/use-requerimiento-detalle";
import { useInventarioSelects } from "../../shared/use-inventario-selects";
import { RegistrarCompraDialog } from "../../ingresos/components/registrar-compra-dialog";
import type {
  CrearIngresoData,
  LineaIngreso,
} from "../../ingresos/hooks/use-ingresos";
import {
  EmpleadoPrendasDialog,
  type EdicionInicial,
  type FilaPrenda,
} from "./components/empleado-prendas-dialog";
import {
  EmpleadoDetalleItem,
  type EmpleadoAgrupado,
} from "./components/empleado-detalle-item";
import { ConsolidadoTable } from "./components/consolidado-table";
import { PlanificacionTable } from "./components/planificacion-table";
import { CargaMasivaPanel } from "./components/carga-masiva-panel";
import { ItemsDialog } from "./components/items-dialog";
import { ItemsLista, type LineaItemLista } from "./components/items-lista";
import { descargarArchivo } from "../../shared/descargar-archivo";
import {
  ESTADO_REQUERIMIENTO_LABELS,
  type EstadoRequerimiento,
  type LineaItem,
} from "@/types/inventario";

const ESTADO_BADGE: Record<EstadoRequerimiento, string> = {
  BORRADOR: "bg-amber-100 text-amber-800 border-amber-200",
  APROBADO: "bg-green-100 text-green-800 border-green-200",
  FINALIZADO: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function RequerimientoDetallePage() {
  const params = useParams();
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();
  const {
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
    refrescar,
  } = useRequerimientoDetalle(id);

  const { tipos, proveedores } = useInventarioSelects();

  const usuario = useUser();
  const puedeAprobar = hasPermission(
    usuario,
    "inventarios:requerimientos_aprobar",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [masivoOpen, setMasivoOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [itemsKey, setItemsKey] = useState(0);

  // Remonta el diálogo de ítems al abrir para que tome las líneas actuales.
  const abrirItems = () => {
    setItemsKey((k) => k + 1);
    setItemsOpen(true);
  };
  const [edicion, setEdicion] = useState<EdicionInicial | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [preparandoId, setPreparandoId] = useState<number | null>(null);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);
  const [compraOpen, setCompraOpen] = useState(false);
  const [compraKey, setCompraKey] = useState(0);
  const [guardandoCompra, setGuardandoCompra] = useState(false);

  const abrirGenerarCompra = () => {
    setCompraKey((k) => k + 1);
    setCompraOpen(true);
  };

  const crearCompra = async (data: CrearIngresoData): Promise<boolean> => {
    setGuardandoCompra(true);
    try {
      const res = await api.post<{ total_items: number }>(
        "/inventario/ingresos",
        { ...data, requerimiento_id: id },
      );
      toast.success(`Compra registrada: ${res.total_items} items creados`);
      await refrescar();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al registrar la compra"));
      return false;
    } finally {
      setGuardandoCompra(false);
    }
  };

  const abrirAgregar = () => {
    setEdicion(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const abrirEdicion = async (empleadoId: number, nombre: string) => {
    if (!requerimiento) return;
    setPreparandoId(empleadoId);
    try {
      const tallas = await tallasEmpleado(empleadoId);
      const lineasReq = requerimiento.detalles.filter(
        (d) => d.empleado_id === empleadoId,
      );
      const cubiertos = new Set(tallas.map((t) => t.tipo_uniforme_id));
      const base: FilaPrenda[] = tallas.map((t) => {
        const linea = lineasReq.find(
          (l) => l.tipo_uniforme.id === t.tipo_uniforme_id,
        );
        return {
          ...t,
          talla: linea?.talla ?? t.talla,
          cantidad: linea ? linea.cantidad : 0,
        };
      });
      // Conservar líneas de tipos que ya no figuran en el catálogo activo.
      const extra: FilaPrenda[] = lineasReq
        .filter((l) => !cubiertos.has(l.tipo_uniforme.id))
        .map((l) => ({
          tipo_uniforme_id: l.tipo_uniforme.id,
          tipo_nombre: l.tipo_uniforme.nombre,
          cantidad_estandar: l.cantidad,
          talla: l.talla,
          cantidad: l.cantidad,
        }));
      setEdicion({
        empleadoId,
        empleadoNombre: nombre,
        filas: [...base, ...extra],
      });
      setDialogKey((k) => k + 1);
      setDialogOpen(true);
    } finally {
      setPreparandoId(null);
    }
  };

  const descargar = async (formato: "excel" | "pdf") => {
    setDescargando(formato);
    try {
      const ext = formato === "excel" ? "xlsx" : "pdf";
      await descargarArchivo(
        `/inventario/requerimientos/${id}/export/${formato}`,
        `Requerimiento_${id}.${ext}`,
      );
    } catch {
      toast.error("No se pudo descargar el archivo");
    } finally {
      setDescargando(null);
    }
  };

  // Agrupar detalles por empleado para la vista detallada; las líneas sin
  // empleado (ítems directos / lista de compra) van aparte. DEBE ir ANTES de
  // los early returns (loading / no encontrado): un hook no puede llamarse
  // condicionalmente o se viola la regla de hooks (React #310).
  const { empleados, itemsSueltos, lineasItem } = useMemo(() => {
    const porEmpleado = new Map<number, EmpleadoAgrupado>();
    const sueltos: LineaItemLista[] = [];
    if (!requerimiento) {
      return {
        empleados: [],
        itemsSueltos: sueltos,
        lineasItem: [] as LineaItem[],
      };
    }
    for (const d of requerimiento.detalles) {
      const linea = {
        tipoId: d.tipo_uniforme.id,
        tipoNombre: d.tipo_uniforme.nombre,
        talla: d.talla,
        cantidad: d.cantidad,
      };
      // Línea sin empleado: pertenece a la lista de compra de ítems directos.
      if (d.empleado_id === null || d.empleado === null) {
        sueltos.push(linea);
        continue;
      }
      const key = d.empleado_id;
      const actual = porEmpleado.get(key);
      if (actual) {
        actual.lineas.push(linea);
      } else {
        porEmpleado.set(key, {
          empleadoId: key,
          nombre: `${d.empleado.apellido_paterno} ${d.empleado.apellido_materno}, ${d.empleado.nombres}`,
          dni: d.empleado.numero_documento,
          lineas: [linea],
        });
      }
    }
    const items: LineaItem[] = sueltos.map((l) => ({
      tipo_uniforme_id: l.tipoId,
      talla: l.talla,
      cantidad: l.cantidad,
    }));
    return {
      empleados: [...porEmpleado.values()],
      itemsSueltos: sueltos,
      lineasItem: items,
    };
  }, [requerimiento]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requerimiento) {
    return (
      <p className="text-sm text-muted-foreground">
        Requerimiento no encontrado.
      </p>
    );
  }

  const totalLineas = requerimiento.detalles.length;
  const esBorrador = requerimiento.estado === "BORRADOR";
  const esAprobado = requerimiento.estado === "APROBADO";

  const proveedor = requerimiento.proveedor;
  // Se compra el FALTANTE (requerido − stock disponible), no el total: si ya
  // hay stock de una talla, no se vuelve a comprar. Evita sobrecompra.
  const lineasCompra: LineaIngreso[] = planificacion
    .filter((p) => p.faltante > 0)
    .map((p) => ({
      tipo_uniforme_id: p.tipo_uniforme_id,
      talla: p.talla,
      cantidad: p.faltante,
      precio_unitario: 0,
    }));
  // La compra se genera recién con el requerimiento APROBADO (el operario ya
  // compró con el cargo y se registra lo que llegó).
  const puedeGenerarCompra =
    esAprobado && !!proveedor && lineasCompra.length > 0;
  const tituloGenerarCompra = !esAprobado
    ? "El requerimiento debe estar aprobado"
    : !proveedor
      ? "Asigna un proveedor al requerimiento"
      : lineasCompra.length === 0
        ? "No hay prendas faltantes (el stock ya cubre el requerimiento)"
        : undefined;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/inventario/requerimientos">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">
                {requerimiento.nombre}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs ${ESTADO_BADGE[requerimiento.estado]}`}
              >
                {ESTADO_REQUERIMIENTO_LABELS[requerimiento.estado]}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {formatDateSafe(requerimiento.fecha)}
            </p>
            {/* Proveedor (destinatario del cargo). Editable solo en borrador. */}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Proveedor:</span>
              {esBorrador ? (
                <Select
                  value={proveedor ? String(proveedor.id) : undefined}
                  onValueChange={(v) => asignarProveedor(Number(v))}
                  disabled={saving}
                >
                  <SelectTrigger className="h-7 w-[260px] text-xs">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">
                  {proveedor?.nombre ?? "—"}
                </span>
              )}
              {esBorrador && !proveedor && (
                <span className="text-xs text-amber-600">
                  (obligatorio para aprobar)
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar("excel")}
              disabled={descargando !== null}
            >
              {descargando === "excel" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1 h-4 w-4" />
              )}
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => descargar("pdf")}
              disabled={descargando !== null}
            >
              {descargando === "pdf" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1 h-4 w-4" />
              )}
              PDF
            </Button>
            <span
              title={tituloGenerarCompra}
              className={!puedeGenerarCompra ? "cursor-not-allowed" : undefined}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={abrirGenerarCompra}
                disabled={!puedeGenerarCompra}
              >
                <ShoppingCart className="mr-1 h-4 w-4" />
                Generar compra
              </Button>
            </span>
            {esBorrador && (
              <>
                <Button size="sm" onClick={abrirItems}>
                  <Package className="mr-1 h-4 w-4" />
                  Agregar ítems
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMasivoOpen(true)}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Agregar empleados
                </Button>
                <Button size="sm" variant="outline" onClick={abrirAgregar}>
                  <Plus className="mr-1 h-4 w-4" />
                  Cargar 1 empleado
                </Button>
                {puedeAprobar && (
                  <Button
                    size="sm"
                    onClick={aprobar}
                    disabled={saving || totalLineas === 0 || !proveedor}
                    title={
                      totalLineas === 0
                        ? "Agrega al menos un ítem o empleado"
                        : !proveedor
                          ? "Asigna un proveedor antes de aprobar"
                          : "Aprueba el requerimiento para autorizar la compra"
                    }
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Aprobar
                  </Button>
                )}
              </>
            )}
            {esAprobado && puedeAprobar && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={rechazar}
                  disabled={saving}
                >
                  <Undo2 className="mr-1 h-4 w-4" />
                  Volver a borrador
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={finalizar}
                  disabled={saving}
                  title="Cerrar sin registrar compra (el stock ya cubre)"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {requerimiento.aprobado_por && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div className="text-sm">
            <p className="font-medium text-green-800">
              Cargo autorizado para compra
            </p>
            <p className="text-green-700">
              Aprobado por{" "}
              <span className="font-medium">
                {requerimiento.aprobado_por.nombre_completo}
              </span>
              {requerimiento.fecha_aprobacion
                ? ` · ${formatDateTimeSafe(requerimiento.fecha_aprobacion)}`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-green-600">
              Descarga el PDF para que el operario lo lleve a la compra.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ítems (lista de compra)
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Prendas a comprar sin asociar a un empleado. Es el modo
                principal para armar el requerimiento.
              </p>
            </div>
            {esBorrador && (
              <Button size="sm" variant="outline" onClick={abrirItems}>
                <Plus className="mr-1 h-4 w-4" />
                {itemsSueltos.length > 0 ? "Editar ítems" : "Agregar ítems"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ItemsLista lineas={itemsSueltos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Empleados cargados ({empleados.length})
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Asistente opcional: arma el requerimiento por empleado (talla
            sugerida y dotación). Las prendas se suman al consolidado.
          </p>
        </CardHeader>
        <CardContent>
          {empleados.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aún no hay empleados. Usa &quot;Agregar empleados&quot; o
              &quot;Cargar 1 empleado&quot; si quieres armar por persona.
            </p>
          ) : (
            <div>
              {empleados.map((e) => (
                <EmpleadoDetalleItem
                  key={e.empleadoId}
                  empleado={e}
                  editable={esBorrador}
                  preparando={preparandoId === e.empleadoId}
                  onEditar={abrirEdicion}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consolidado (para compra)</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsolidadoTable consolidado={consolidado} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Planificación de compra</CardTitle>
          <p className="text-xs text-muted-foreground">
            Comparativa entre lo requerido y el stock disponible. Las filas en
            rojo indican prendas por comprar.
          </p>
        </CardHeader>
        <CardContent>
          <PlanificacionTable planificacion={planificacion} loading={false} />
        </CardContent>
      </Card>

      <EmpleadoPrendasDialog
        key={`emp-${dialogKey}`}
        open={dialogOpen}
        saving={saving}
        onOpenChange={setDialogOpen}
        cargarTallas={tallasEmpleado}
        onGuardar={guardarEmpleado}
        inicial={edicion}
      />

      <CargaMasivaPanel
        requerimientoId={id}
        open={masivoOpen}
        onOpenChange={setMasivoOpen}
        onGuardado={refrescar}
      />

      <ItemsDialog
        key={`items-${itemsKey}`}
        open={itemsOpen}
        saving={saving}
        onOpenChange={setItemsOpen}
        tipos={tipos}
        inicial={lineasItem}
        onGuardar={guardarItems}
      />

      {proveedor && (
        <RegistrarCompraDialog
          key={`compra-${compraKey}`}
          open={compraOpen}
          saving={guardandoCompra}
          tipos={tipos}
          proveedores={proveedores}
          onOpenChange={setCompraOpen}
          onSubmit={crearCompra}
          inicial={{ proveedorId: String(proveedor.id), lineas: lineasCompra }}
        />
      )}
    </div>
  );
}
