"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { hasPermission } from "@/lib/auth";
import { useUser } from "@/contexts/user-context";
import type { ItemInventario, PaginatedResponse } from "@/types/inventario";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras registrar la baja (o la solicitud) para refrescar las vistas. */
  onRegistrada: () => void;
}

export function RegistrarBajaDialog({
  open,
  onOpenChange,
  onRegistrada,
}: Props) {
  const usuario = useUser();
  // Quien puede aprobar da de baja directo; el resto solo solicita.
  const puedeAprobar = hasPermission(usuario, "inventarios:baja_aprobar");

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ItemInventario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<ItemInventario | null>(null);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const reset = () => {
    setBusqueda("");
    setResultados([]);
    setSeleccionado(null);
    setMotivo("");
  };

  const buscar = async () => {
    const q = busqueda.trim();
    if (!q) return;
    setBuscando(true);
    try {
      const params = new URLSearchParams({
        estado: "DISPONIBLE",
        buscar: q,
        limit: "10",
      });
      const res = await api.get<PaginatedResponse<ItemInventario>>(
        `/inventario/items?${params.toString()}`,
      );
      setResultados(res.data);
      if (res.data.length === 0) {
        toast.info("No se encontraron prendas disponibles con ese código");
      }
    } catch {
      toast.error("Error al buscar la prenda");
    } finally {
      setBuscando(false);
    }
  };

  const confirmar = async () => {
    if (!seleccionado || motivo.trim().length < 5) return;
    setGuardando(true);
    try {
      const endpoint = puedeAprobar
        ? "/inventario/bajas/directa"
        : "/inventario/bajas";
      await api.post(endpoint, {
        item_id: seleccionado.id,
        motivo: motivo.trim(),
      });
      toast.success(
        puedeAprobar
          ? "Prenda dada de baja"
          : "Solicitud de baja enviada, pendiente de aprobación",
      );
      reset();
      onOpenChange(false);
      onRegistrada();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo registrar la baja"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar baja de prenda</DialogTitle>
          <DialogDescription>
            {puedeAprobar
              ? "La prenda saldrá del stock inmediatamente."
              : "Tu solicitud quedará pendiente de aprobación del administrador."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="buscar-prenda">1. Busca la prenda por código</Label>
            <div className="flex gap-2">
              <Input
                id="buscar-prenda"
                placeholder="Ej: CAM-0001"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscar();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={buscar}
                disabled={buscando || !busqueda.trim()}
              >
                {buscando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="sr-only">Buscar</span>
              </Button>
            </div>
          </div>

          {resultados.length > 0 && !seleccionado && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
              {resultados.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSeleccionado(it)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="font-mono">{it.codigo}</span>
                  <span className="text-muted-foreground">
                    {it.tipo_uniforme.nombre} · {it.talla}
                  </span>
                </button>
              ))}
            </div>
          )}

          {seleccionado && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div>
                <span className="font-mono font-medium">
                  {seleccionado.codigo}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {seleccionado.tipo_uniforme.nombre} · Talla{" "}
                  {seleccionado.talla}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSeleccionado(null)}
              >
                Cambiar
              </Button>
            </div>
          )}

          {seleccionado && (
            <div className="space-y-2">
              <Label htmlFor="motivo-baja">
                2. Motivo de la baja <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="motivo-baja"
                rows={3}
                maxLength={500}
                placeholder="Ej: prenda dañada, manchada, fin de vida útil..."
                className="resize-none"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 5 caracteres.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            variant={puedeAprobar ? "destructive" : "default"}
            onClick={confirmar}
            disabled={guardando || !seleccionado || motivo.trim().length < 5}
          >
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {puedeAprobar ? "Dar de baja" : "Solicitar baja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
