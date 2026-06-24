"use client";

import { useAuthImage } from "@/hooks/useAuthImage";
import type { Empresa } from "@/types";

interface SidebarEmpresaActivaProps {
  empresa?: Empresa;
}

/** Producto detrás de la plataforma (marca secundaria, "powered by"). */
const MARCA_PRODUCTO = "JJMM · Sistema de Planillas";

/**
 * Deriva las iniciales de la empresa a partir de su nombre.
 * Toma la primera letra de las dos primeras palabras significativas.
 * Ej: "Constructora del Sur" -> "CS".
 */
function obtenerIniciales(nombre: string): string {
  const ignoradas = new Set(["de", "del", "la", "las", "los", "y", "el", "e"]);
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => !ignoradas.has(palabra.toLowerCase()));

  const fuente = palabras.length > 0 ? palabras : nombre.trim().split(/\s+/);

  return fuente
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Encabezado del sidebar: muestra el logo y nombre de la EMPRESA ACTIVA
 * como elemento principal, y la marca del producto (JJMM) de forma sutil.
 *
 * El logo se carga con el mismo patrón autenticado por JWT que el resto
 * de imágenes de empresa (useAuthImage). Si la empresa no tiene logo o la
 * imagen no carga, se muestra un fallback con las iniciales.
 */
export function SidebarEmpresaActiva({ empresa }: SidebarEmpresaActivaProps) {
  const logoUrl = useAuthImage(empresa?.logo_url);
  const nombreEmpresa =
    empresa?.nombre_comercial?.trim() ||
    empresa?.razon_social?.trim() ||
    "Sin empresa";
  const iniciales = obtenerIniciales(nombreEmpresa) || "?";

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent ring-1 ring-sidebar-border">
        {logoUrl ? (
          // logoUrl es un blob URL local resuelto por useAuthImage, no optimizable por next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={nombreEmpresa}
            className="size-full object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="text-base font-bold tracking-tight text-sidebar-accent-foreground"
          >
            {iniciales}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span
          className="truncate font-semibold leading-tight text-sidebar-foreground"
          title={nombreEmpresa}
        >
          {nombreEmpresa}
        </span>
        <span className="truncate text-xs text-sidebar-foreground/60">
          {MARCA_PRODUCTO}
        </span>
      </div>
    </div>
  );
}
