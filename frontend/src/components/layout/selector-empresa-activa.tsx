'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Empresa, Usuario } from '@/types';
import { hasPermission } from '@/lib/auth';
import { useEmpresaActiva } from '@/contexts/empresa-activa-context';
import { cn } from '@/lib/utils';

interface SelectorEmpresaActivaProps {
  usuario: Usuario | null;
}

/** Nombre visible de una empresa (prioriza el comercial). */
function nombreEmpresa(empresa: Empresa): string {
  return empresa.nombre_comercial || empresa.razon_social;
}

/**
 * Selector de empresa activa. Visible solo para superadmins (permiso wildcard `*`).
 *
 * Es un Combobox (Popover + Command): con 90+ empresas, un Select plano es inusable,
 * así que se reemplaza por una lista con buscador y autocompletado por teclado.
 * Al elegir una empresa, persiste el id en el contexto/localStorage y recarga la app
 * para que todas las vistas refetcheen con la nueva empresa activa.
 */
export function SelectorEmpresaActiva({ usuario }: SelectorEmpresaActivaProps) {
  const esSuperadmin = hasPermission(usuario, '*');
  const { empresaActivaId, setEmpresaActivaId } = useEmpresaActiva();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!esSuperadmin) return;

    let activo = true;
    const cargarEmpresas = async () => {
      try {
        // GET /companies devuelve un arreglo de empresas para superadmins.
        const data = await api.getArray<Empresa>('/companies');
        if (activo) setEmpresas(data);
      } catch {
        // Si falla la carga, el selector queda vacío sin romper el layout.
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarEmpresas();
    return () => {
      activo = false;
    };
  }, [esSuperadmin]);

  // Valor controlado: la empresa activa guardada o, por defecto, la del usuario.
  // Se normaliza a string para que coincida con el id de cada empresa.
  const valorActual =
    empresaActivaId ??
    (usuario?.empresa_id != null ? String(usuario.empresa_id) : undefined);

  const empresaSeleccionada = useMemo(
    () => empresas.find((empresa) => String(empresa.id) === valorActual),
    [empresas, valorActual],
  );

  if (!esSuperadmin) return null;

  const handleCambio = (id: string) => {
    setAbierto(false);
    if (id === valorActual) return;
    setEmpresaActivaId(id);
    // Recarga completa: la forma más confiable de garantizar que todas las vistas
    // y hooks refetcheen con el header X-Empresa-Activa actualizado.
    window.location.reload();
  };

  const etiqueta = cargando
    ? 'Cargando empresas...'
    : empresaSeleccionada
      ? nombreEmpresa(empresaSeleccionada)
      : 'Selecciona empresa';

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          aria-label="Empresa activa"
          disabled={cargando}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{etiqueta}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>No se encontró ninguna empresa.</CommandEmpty>
            {empresas.map((empresa) => {
              const id = String(empresa.id);
              const nombre = nombreEmpresa(empresa);
              return (
                <CommandItem
                  key={empresa.id}
                  // value se usa para el filtrado de búsqueda; incluimos el RUC
                  // para poder buscar también por número de documento.
                  value={`${nombre} ${empresa.ruc ?? ''}`}
                  onSelect={() => handleCambio(id)}
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      id === valorActual ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{nombre}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
