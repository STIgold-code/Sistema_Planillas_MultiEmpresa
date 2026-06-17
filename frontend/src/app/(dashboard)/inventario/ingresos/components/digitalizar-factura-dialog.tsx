"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Paperclip, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toDateString } from "@/lib/utils";
import { bloquearTeclasDecimal } from "@/lib/numeric-input";
import type {
  TipoUniformeSelect,
  ProveedorSelect,
  Requerimiento,
  ComparativaLinea,
  CrearFacturaData,
  LineaFactura,
} from "@/types/inventario";
import { LineaIngresoRow } from "./linea-ingreso-row";
import { ComparativaTable } from "./comparativa-table";
import { useFactura, type FacturaArchivoSubido } from "../hooks/use-factura";

interface Props {
  open: boolean;
  tipos: TipoUniformeSelect[];
  proveedores: ProveedorSelect[];
  /** Requerimientos APROBADOS de los que se puede "jalar" la compra. */
  requerimientos: Requerimiento[];
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras registrar la factura para refrescar el listado. */
  onRegistrado: () => void;
}

const LINEA_VACIA: LineaFactura = {
  tipo_uniforme_id: 0,
  talla: "",
  cantidad: 1,
  precio_unitario: 0,
};

const TAMANO_MAX_MB = 10;
const EXTENSIONES = ".pdf,.jpg,.jpeg,.png,.webp";

export function DigitalizarFacturaDialog({
  open,
  tipos,
  proveedores,
  requerimientos,
  onOpenChange,
  onRegistrado,
}: Props) {
  const { guardando, subiendo, subirArchivo, crearFactura, fetchComparativa } =
    useFactura();

  const [proveedorId, setProveedorId] = useState("");
  const [requerimientoId, setRequerimientoId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(toDateString(new Date()));
  const [montoTotal, setMontoTotal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<LineaFactura[]>([{ ...LINEA_VACIA }]);
  const [archivo, setArchivo] = useState<FacturaArchivoSubido | null>(null);
  const [comparativa, setComparativa] = useState<ComparativaLinea[]>([]);
  const [cargandoComparativa, setCargandoComparativa] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setProveedorId("");
    setRequerimientoId("");
    setNumeroFactura("");
    setFechaFactura(toDateString(new Date()));
    setMontoTotal("");
    setObservaciones("");
    setLineas([{ ...LINEA_VACIA }]);
    setArchivo(null);
    setComparativa([]);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  // Al elegir un requerimiento, prellenar el proveedor y cargar la comparativa.
  useEffect(() => {
    if (!requerimientoId) {
      setComparativa([]);
      return;
    }
    const req = requerimientos.find((r) => String(r.id) === requerimientoId);
    if (req?.proveedor) setProveedorId(String(req.proveedor.id));

    let activo = true;
    setCargandoComparativa(true);
    fetchComparativa(Number(requerimientoId))
      .then((data) => {
        if (activo) setComparativa(data);
      })
      .finally(() => {
        if (activo) setCargandoComparativa(false);
      });
    return () => {
      activo = false;
    };
    // fetchComparativa es estable; requerimientos solo se usa para prellenar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requerimientoId]);

  const updateLinea = (index: number, linea: LineaFactura) =>
    setLineas((prev) => prev.map((l, i) => (i === index ? linea : l)));
  const addLinea = () => setLineas((prev) => [...prev, { ...LINEA_VACIA }]);
  const removeLinea = (index: number) =>
    setLineas((prev) => prev.filter((_, i) => i !== index));

  const lineasValidas = lineas.filter(
    (l) =>
      l.tipo_uniforme_id > 0 &&
      l.talla.trim() &&
      l.cantidad >= 1 &&
      l.precio_unitario >= 0,
  );

  const totalItems = lineasValidas.reduce((acc, l) => acc + l.cantidad, 0);
  const totalCalculado = lineasValidas.reduce(
    (acc, l) => acc + l.cantidad * l.precio_unitario,
    0,
  );

  const requerimientosAprobados = useMemo(
    () => requerimientos.filter((r) => r.estado === "APROBADO"),
    [requerimientos],
  );

  const canSubmit =
    !!proveedorId &&
    !!numeroFactura.trim() &&
    !!fechaFactura &&
    lineasValidas.length > 0;

  const elegirArchivo = () => inputArchivoRef.current?.click();

  const onArchivoSeleccionado = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > TAMANO_MAX_MB * 1024 * 1024) {
      toast.error(`El archivo supera los ${TAMANO_MAX_MB} MB.`);
      e.target.value = "";
      return;
    }
    const subido = await subirArchivo(file);
    if (subido) setArchivo(subido);
    e.target.value = "";
  };

  const quitarArchivo = () => setArchivo(null);

  const handleSubmit = async () => {
    const data: CrearFacturaData = {
      proveedor_id: Number(proveedorId),
      requerimiento_id: requerimientoId ? Number(requerimientoId) : undefined,
      numero_factura: numeroFactura.trim(),
      fecha_factura: fechaFactura,
      monto_total: montoTotal ? Number(montoTotal) : undefined,
      archivo_url: archivo?.url,
      archivo_nombre: archivo?.nombre,
      observaciones: observaciones.trim() || undefined,
      lineas: lineasValidas.map((l) => ({ ...l, talla: l.talla.trim() })),
    };
    const ok = await crearFactura(data);
    if (ok) {
      onRegistrado();
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Digitalizar factura</DialogTitle>
          <DialogDescription>
            Registra la factura del proveedor y adjunta el archivo. Al
            confirmar, las prendas de la factura se cargan al stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Jalar requerimiento (opcional) */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <Label>Requerimiento de origen (opcional)</Label>
            <Select
              value={requerimientoId || "ninguno"}
              onValueChange={(v) =>
                setRequerimientoId(v === "ninguno" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Compra libre (sin requerimiento)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">
                  Compra libre (sin requerimiento)
                </SelectItem>
                {requerimientosAprobados.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Al elegir un requerimiento aprobado se compara lo pedido con lo
              que trae la factura.
            </p>
          </div>

          {/* Cabecera de la factura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Proveedor <span className="text-red-600">*</span>
              </Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                N° de factura <span className="text-red-600">*</span>
              </Label>
              <Input
                maxLength={50}
                placeholder="Ej: F001-00012345"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Fecha de factura <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                min="2020-01-01"
                max="2100-12-31"
                value={fechaFactura}
                onChange={(e) => setFechaFactura(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto total de la factura</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Opcional"
                value={montoTotal}
                onKeyDown={bloquearTeclasDecimal}
                onChange={(e) => setMontoTotal(e.target.value)}
              />
            </div>
          </div>

          {/* Adjuntar archivo */}
          <div className="space-y-2">
            <Label>Archivo de la factura (imagen o PDF)</Label>
            <input
              ref={inputArchivoRef}
              type="file"
              accept={EXTENSIONES}
              className="hidden"
              onChange={onArchivoSeleccionado}
            />
            {archivo ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{archivo.nombre}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={quitarArchivo}
                  aria-label="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={elegirArchivo}
                disabled={subiendo}
              >
                {subiendo ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="mr-2 h-4 w-4" />
                )}
                {subiendo ? "Subiendo..." : "Adjuntar archivo"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos: PDF, JPG, PNG, WEBP. Máximo {TAMANO_MAX_MB} MB.
            </p>
          </div>

          {/* Líneas de la factura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Prendas de la factura <span className="text-red-600">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLinea}
              >
                <Plus className="mr-1 h-3 w-3" />
                Agregar línea
              </Button>
            </div>
            <div className="space-y-2">
              {lineas.map((linea, index) => (
                <LineaIngresoRow
                  key={index}
                  linea={linea}
                  tipos={tipos}
                  index={index}
                  onChange={updateLinea}
                  onRemove={removeLinea}
                  removable={lineas.length > 1}
                />
              ))}
            </div>
            {lineasValidas.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-4 border-t pt-2 text-sm">
                <span className="text-muted-foreground">
                  Total items: <strong>{totalItems}</strong>
                </span>
                <span className="text-muted-foreground">
                  Total calculado:{" "}
                  <strong>S/ {totalCalculado.toFixed(2)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Comparativa pedido-vs-recibido */}
          {requerimientoId && (
            <div className="space-y-2">
              <Label>Comparativa pedido vs. recibido</Label>
              {cargandoComparativa ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ComparativaTable comparativa={comparativa} />
              )}
              <p className="text-xs text-muted-foreground">
                La factura es la realidad: las diferencias no bloquean el
                registro, solo se muestran.
              </p>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              rows={2}
              maxLength={500}
              className="resize-none"
              placeholder="Opcional"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={guardando || !canSubmit}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
