"use client";

import { useState } from "react";
import {
  Plus,
  Loader2,
  HandHelping,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { descargarArchivo } from "../shared/descargar-archivo";
import { useEntregas } from "./hooks/use-entregas";
import { useInventarioSelects } from "../shared/use-inventario-selects";
import { EntregasTable } from "./components/entregas-table";
import { EntregarDialog } from "./components/entregar-dialog";
import { EntregaMasivaPanel } from "./components/entrega-masiva-panel";
import { EntregaDetalleDialog } from "./components/entrega-detalle-dialog";
import type { EntregaUniforme } from "@/types/inventario";

export default function EntregasPage() {
  const { entregas, loading, saving, crear, devolver, fetchDetalle, refetch } =
    useEntregas();
  const { tipos } = useInventarioSelects();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [masivaOpen, setMasivaOpen] = useState(false);
  const [detalle, setDetalle] = useState<EntregaUniforme | null>(null);
  const [devolviendo, setDevolviendo] = useState(false);
  const [descargandoLista, setDescargandoLista] = useState(false);

  const exportarLista = async () => {
    setDescargandoLista(true);
    try {
      await descargarArchivo(
        "/inventario/entregas/export/excel",
        "Entregas.xlsx",
      );
    } catch {
      toast.error("No se pudo descargar el Excel");
    } finally {
      setDescargandoLista(false);
    }
  };

  const verDetalle = async (id: number) => {
    const data = await fetchDetalle(id);
    if (data) setDetalle(data);
  };

  const handleDevolver = async (
    itemIds: number[],
    condicion: "BUENA" | "DANADA",
  ) => {
    setDevolviendo(true);
    const ok = await devolver(itemIds, condicion);
    setDevolviendo(false);
    return ok;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <HandHelping className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Entregas</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Entrega de uniformes a empleados
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={exportarLista}
            disabled={descargandoLista || entregas.length === 0}
            className="w-full sm:w-auto"
          >
            {descargandoLista ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setMasivaOpen(true)}
            className="w-full sm:w-auto"
          >
            <Users className="mr-2 h-4 w-4" />
            Entrega masiva
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva entrega
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <EntregasTable entregas={entregas} onVer={verDetalle} />
      )}

      <EntregarDialog
        open={dialogOpen}
        saving={saving}
        tipos={tipos}
        onOpenChange={setDialogOpen}
        onSubmit={crear}
      />

      <EntregaMasivaPanel
        open={masivaOpen}
        onOpenChange={setMasivaOpen}
        onEntregado={refetch}
      />

      <EntregaDetalleDialog
        entrega={detalle}
        devolviendo={devolviendo}
        onClose={() => setDetalle(null)}
        onDevolver={handleDevolver}
      />
    </div>
  );
}
