"use client";

import { useState, useEffect } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EmpleadoOption {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
}

interface Props {
  selectedId: number | null;
  onSelect: (empleado: EmpleadoOption) => void;
}

export function EmpleadoSelector({ selectedId, onSelect }: Props) {
  const [buscar, setBuscar] = useState("");
  const [opciones, setOpciones] = useState<EmpleadoOption[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const termino = buscar.trim();
    let vivo = true;
    const timer = setTimeout(async () => {
      if (termino.length < 2) {
        if (vivo) setOpciones([]);
        return;
      }
      try {
        const params = new URLSearchParams({ buscar: termino, limit: "10" });
        const res = await api.get<{ data: EmpleadoOption[] }>(
          `/empleados?${params.toString()}`,
        );
        if (!vivo) return;
        setOpciones(res.data);
        setAbierto(true);
      } catch {
        if (vivo) setOpciones([]);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [buscar]);

  const nombre = (e: EmpleadoOption) =>
    `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar empleado por nombre o DNI..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          onFocus={() => opciones.length > 0 && setAbierto(true)}
        />
      </div>
      {abierto && opciones.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md">
          {opciones.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  selectedId === e.id && "bg-accent",
                )}
                onClick={() => {
                  onSelect(e);
                  setBuscar(nombre(e));
                  setAbierto(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nombre(e)}
                  </span>
                  <span className="block text-xs text-muted-foreground font-mono">
                    {e.numero_documento}
                  </span>
                </span>
                {selectedId === e.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
