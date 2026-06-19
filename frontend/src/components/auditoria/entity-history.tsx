'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, History, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { JsonDiffViewer } from './json-diff-viewer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditoriaRecord {
  id: number;
  usuario: {
    id: number;
    nombre_completo: string;
    email: string;
  } | null;
  accion: string;
  datos_anteriores: Record<string, any> | null;
  datos_nuevos: Record<string, any> | null;
  created_at: string;
}

interface EntityHistoryProps {
  tabla: string;
  registroId: number;
  titulo?: string;
  className?: string;
  maxItems?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const ACCION_CONFIG: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Creado', color: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Actualizado', color: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Eliminado', color: 'bg-red-100 text-red-800' },
  CALCULAR: { label: 'Calculado', color: 'bg-amber-100 text-amber-800' },
  APROBAR: { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-800' },
  RECHAZAR: { label: 'Rechazado', color: 'bg-rose-100 text-rose-800' },
  PAGAR: { label: 'Pagado', color: 'bg-cyan-100 text-cyan-800' },
  ANULAR: { label: 'Anulado', color: 'bg-orange-100 text-orange-800' },
  CERRAR_PERIODO: { label: 'Cerrado', color: 'bg-slate-100 text-slate-800' },
  REABRIR_PERIODO: { label: 'Reabierto', color: 'bg-indigo-100 text-indigo-800' },
  APROBAR_JEFE: { label: 'Aprobado (Jefe)', color: 'bg-teal-100 text-teal-800' },
  APROBAR_RRHH: { label: 'Aprobado (RRHH)', color: 'bg-lime-100 text-lime-800' },
};

function getAccionConfig(accion: string) {
  return ACCION_CONFIG[accion] || { label: accion, color: 'bg-gray-100 text-gray-800' };
}

export function EntityHistory({
  tabla,
  registroId,
  titulo = 'Historial de cambios',
  className,
  maxItems = 10,
  collapsible = true,
  defaultOpen = false,
}: EntityHistoryProps) {
  const [records, setRecords] = useState<AuditoriaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await api.get<{
          data: AuditoriaRecord[];
          meta: { total: number };
        }>(`/auditoria/entidad/${tabla}/${registroId}?limit=${maxItems}`);
        setRecords(response.data || []);
        setTotal(response.meta?.total || 0);
      } catch (error) {
        console.error('Error fetching entity history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (registroId) {
      fetchHistory();
    }
  }, [tabla, registroId, maxItems]);

  const content = (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No hay historial registrado
        </div>
      ) : (
        <>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

            {/* Timeline items */}
            <div className="space-y-4">
              {records.map((record, index) => {
                const config = getAccionConfig(record.accion);
                const isExpanded = expandedId === record.id;
                const hasChanges = record.datos_anteriores || record.datos_nuevos;

                return (
                  <div key={record.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-0 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center',
                        index === 0 ? 'bg-primary' : 'bg-muted'
                      )}
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        index === 0 ? 'bg-background' : 'bg-muted-foreground/50'
                      )} />
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <Badge variant="secondary" className={`${config.color} border-0 text-xs`}>
                            {config.label}
                          </Badge>
                          {record.datos_nuevos?._descripcion && (
                            <p className="text-sm">{record.datos_nuevos._descripcion}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(record.created_at), "dd/MM/yy HH:mm", { locale: es })}
                          </div>
                          {record.usuario && (
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              {record.usuario.nombre_completo}
                            </div>
                          )}
                        </div>
                      </div>

                      {hasChanges && (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Ocultar cambios
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Ver cambios
                              </>
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="mt-2">
                              <JsonDiffViewer
                                before={record.datos_anteriores}
                                after={record.datos_nuevos}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {total > maxItems && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Mostrando {records.length} de {total} registros
            </p>
          )}
        </>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <div className={cn('space-y-3', className)}>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          {titulo}
          {total > 0 && (
            <span className="text-xs text-muted-foreground">({total})</span>
          )}
        </h3>
        {content}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            {titulo}
            {total > 0 && (
              <span className="text-xs text-muted-foreground">({total})</span>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
