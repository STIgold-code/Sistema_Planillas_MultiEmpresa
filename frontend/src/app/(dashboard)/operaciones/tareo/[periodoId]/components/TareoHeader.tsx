'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Save, Download, Upload, UserPlus, Loader2, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { meses } from '../useTareoDetalle';
import type { TareoGrillaResponse } from '@/types';
import type { SesionTareoResponse } from '@/hooks/useSesionTareo';

interface TareoHeaderProps {
  data: TareoGrillaResponse;
  cambiosPendientes: Map<string, unknown>;
  saving: boolean;
  sincronizando: boolean;
  sesionTareo: {
    sesion: SesionTareoResponse | null;
    esAdmin: boolean;
    esCorrector: boolean;
    requiereSesion: boolean;
    puedeEditar: boolean;
    tiempoRestante: number;
    tiempoFormateado: string;
  };
  onBack: () => void;
  onGuardar: () => void;
  onExportar: () => void;
  onImportar: () => void;
  onSincronizar: () => void;
}

export function TareoHeader({
  data,
  cambiosPendientes,
  saving,
  sincronizando,
  sesionTareo,
  onBack,
  onGuardar,
  onExportar,
  onImportar,
  onSincronizar,
}: TareoHeaderProps) {
  const { sesion, esAdmin, esCorrector, requiereSesion, tiempoRestante, tiempoFormateado } = sesionTareo;
  const periodoActivo = data.periodo.estado !== 'CERRADO' && data.periodo.estado !== 'ANULADO';

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
          Tareo {meses[data.periodo.mes - 1]} {data.periodo.anio}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground truncate">
          {data.meta.total} empleados (Pág. {data.meta.page} de {data.meta.totalPages})
        </p>
      </div>

      {cambiosPendientes.size > 0 && (
        <Badge variant="outline" className="bg-yellow-50 shrink-0">
          {cambiosPendientes.size} cambios
        </Badge>
      )}

      {/* Timer de sesión activa */}
      {periodoActivo && requiereSesion && sesion?.estado === 'ACTIVA' && tiempoRestante > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 flex items-center gap-1 font-mono',
            tiempoRestante <= 300 ? 'bg-red-50 text-red-700 border-red-300' :
            tiempoRestante <= 600 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
            'bg-green-50 text-green-700 border-green-300'
          )}
        >
          <Clock className="h-3 w-3" />
          {tiempoFormateado}
        </Badge>
      )}

      {/* Badge Admin/Corrector */}
      {!requiereSesion && periodoActivo && (
        <Badge variant="outline" className="shrink-0 flex items-center gap-1 bg-green-50 text-green-700 border-green-300">
          <Shield className="h-3 w-3" />
          {esAdmin ? 'Admin' : 'Corrector'}
        </Badge>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onSincronizar}
            disabled={sincronizando || data.periodo.estado === 'CERRADO' || data.periodo.estado === 'ANULADO'}
          >
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sincronizar Empleados</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onExportar}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exportar Excel</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onImportar}
            disabled={data.periodo.estado === 'CERRADO'}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Importar Excel</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className="h-8 shrink-0"
            onClick={onGuardar}
            disabled={saving || cambiosPendientes.size === 0 || data.periodo.estado === 'CERRADO' || !sesionTareo.puedeEditar}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Guardar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Guardar cambios</TooltipContent>
      </Tooltip>
    </div>
  );
}
