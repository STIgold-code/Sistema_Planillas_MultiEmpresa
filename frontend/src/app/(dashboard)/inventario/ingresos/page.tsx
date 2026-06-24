"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, PackagePlus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useIngresos } from "./hooks/use-ingresos";
import { useInventarioSelects } from "../shared/use-inventario-selects";
import { IngresosTable } from "./components/ingresos-table";
import { RegistrarCompraDialog } from "./components/registrar-compra-dialog";
import { DigitalizarFacturaDialog } from "./components/digitalizar-factura-dialog";
import { IngresoDetalleDialog } from "./components/ingreso-detalle-dialog";
import type { IngresoInventarioFull, Requerimiento } from "@/types/inventario";

export default function IngresosPage() {
  const { ingresos, loading, saving, crear, fetchDetalle, refrescar } =
    useIngresos();
  const { tipos, proveedores } = useInventarioSelects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [facturaOpen, setFacturaOpen] = useState(false);
  const [facturaKey, setFacturaKey] = useState(0);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [detalle, setDetalle] = useState<IngresoInventarioFull | null>(null);

  // Requerimientos aprobados para "jalar" la compra en la digitalización.
  useEffect(() => {
    let activo = true;
    // El endpoint es paginado: devuelve { data, meta }, no un array plano.
    api
      .get<{ data: Requerimiento[] }>("/inventario/requerimientos")
      .then((res) => {
        if (activo) setRequerimientos(res.data ?? []);
      })
      .catch(() => {
        // silencioso; el selector quedará vacío
      });
    return () => {
      activo = false;
    };
  }, []);

  const verDetalle = async (id: number) => {
    const data = await fetchDetalle(id);
    if (data) setDetalle(data);
  };

  const abrirFactura = () => {
    setFacturaKey((k) => k + 1);
    setFacturaOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Compras</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Registro de compras de uniformes
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar compra
          </Button>
          <Button onClick={abrirFactura} className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" />
            Digitalizar factura
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <IngresosTable ingresos={ingresos} onVer={verDetalle} />
      )}

      <RegistrarCompraDialog
        open={dialogOpen}
        saving={saving}
        tipos={tipos}
        proveedores={proveedores}
        onOpenChange={setDialogOpen}
        onSubmit={crear}
      />

      <DigitalizarFacturaDialog
        key={`factura-${facturaKey}`}
        open={facturaOpen}
        tipos={tipos}
        proveedores={proveedores}
        requerimientos={requerimientos}
        onOpenChange={setFacturaOpen}
        onRegistrado={refrescar}
      />

      <IngresoDetalleDialog
        ingreso={detalle}
        onClose={() => setDetalle(null)}
      />
    </div>
  );
}
