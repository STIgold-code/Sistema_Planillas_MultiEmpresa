'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { Empresa, Usuario } from '@/types';
import { hasPermission } from '@/lib/auth';
import { useEmpresaActiva } from '@/contexts/empresa-activa-context';
import { Building2 } from 'lucide-react';

interface SelectorEmpresaActivaProps {
  usuario: Usuario | null;
}

/**
 * Selector de empresa activa. Visible solo para superadmins (permiso wildcard `*`).
 * Al elegir una empresa, persiste el id en el contexto/localStorage y recarga la app
 * para que todas las vistas refetcheen con la nueva empresa activa.
 */
export function SelectorEmpresaActiva({ usuario }: SelectorEmpresaActivaProps) {
  const esSuperadmin = hasPermission(usuario, '*');
  const { empresaActivaId, setEmpresaActivaId } = useEmpresaActiva();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);

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

  if (!esSuperadmin) return null;

  const handleCambio = (id: string) => {
    if (id === empresaActivaId) return;
    setEmpresaActivaId(id);
    // Recarga completa: la forma más confiable de garantizar que todas las vistas
    // y hooks refetcheen con el header X-Empresa-Activa actualizado.
    window.location.reload();
  };

  // Valor controlado: la empresa activa guardada o, por defecto, la del usuario.
  // Se normaliza a string para que coincida con el value de cada SelectItem.
  const valorActual =
    empresaActivaId ??
    (usuario?.empresa_id != null ? String(usuario.empresa_id) : undefined);

  return (
    <Select value={valorActual} onValueChange={handleCambio} disabled={cargando}>
      <SelectTrigger className="w-full" aria-label="Empresa activa">
        <span className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0" />
          <SelectValue placeholder={cargando ? 'Cargando empresas...' : 'Selecciona empresa'} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {empresas.map((empresa) => (
          <SelectItem key={empresa.id} value={String(empresa.id)}>
            {empresa.nombre_comercial || empresa.razon_social}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
