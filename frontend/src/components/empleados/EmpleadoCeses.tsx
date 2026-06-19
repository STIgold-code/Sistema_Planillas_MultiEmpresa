'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { EstadoSolicitudCese } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, UserX, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateSafe } from '@/lib/utils';

interface SolicitudCeseItem {
  id: number;
  tipo_cese_id: number;
  tipo_cese?: { id: number; nombre: string } | null;
  motivo?: string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  fecha_efectiva: string;
  estado: EstadoSolicitudCese;
  observaciones_admin?: string | null;
  created_at: string;
  fecha_resolucion?: string | null;
  solicitado_por?: { id: number; nombre_completo: string; email: string } | null;
  resuelto_por?: { id: number; nombre_completo: string; email: string } | null;
}

const estadoBadge: Record<EstadoSolicitudCese, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  PENDIENTE: { variant: 'outline', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
  APROBADA: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
  RECHAZADA: { variant: 'destructive', className: '' },
};

interface EmpleadoCesesProps {
  empleadoId: number;
}

export function EmpleadoCeses({ empleadoId }: EmpleadoCesesProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudCeseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: SolicitudCeseItem[] }>(
        `/solicitudes-cese?empleado_id=${empleadoId}&limit=50`
      );
      setSolicitudes(response.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar solicitudes de cese');
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UserX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin solicitudes de cese</h3>
          <p className="text-sm text-muted-foreground">
            No se han registrado solicitudes de cese para este empleado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Solicitudes de Cese</h3>
        <Badge variant="secondary">{solicitudes.length}</Badge>
      </div>

      {solicitudes.map((sol) => {
        const badge = estadoBadge[sol.estado];
        return (
          <Card key={sol.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {sol.tipo_cese?.nombre || 'Tipo no especificado'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Solicitud #{sol.id} - Creada el {formatDateSafe(sol.created_at)}
                  </CardDescription>
                </div>
                <Badge variant={badge.variant} className={badge.className}>
                  {sol.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha Efectiva</p>
                    <p className="text-sm font-medium">{formatDateSafe(sol.fecha_efectiva)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitado por</p>
                    <p className="text-sm font-medium">
                      {sol.solicitado_por?.nombre_completo || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {sol.motivo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Motivo</p>
                  <p className="text-sm">{sol.motivo}</p>
                </div>
              )}

              {sol.estado !== 'PENDIENTE' && (
                <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t">
                  {sol.resuelto_por && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {sol.estado === 'APROBADA' ? 'Aprobado por' : 'Rechazado por'}
                      </p>
                      <p className="text-sm font-medium">{sol.resuelto_por.nombre_completo}</p>
                      {sol.fecha_resolucion && (
                        <p className="text-xs text-muted-foreground">
                          {formatDateSafe(sol.fecha_resolucion)}
                        </p>
                      )}
                    </div>
                  )}
                  {sol.observaciones_admin && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observaciones</p>
                      <p className="text-sm">{sol.observaciones_admin}</p>
                    </div>
                  )}
                </div>
              )}

              {sol.archivo_url && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <FileText className="h-8 w-8 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sol.archivo_nombre || 'Constancia'}
                    </p>
                    <p className="text-xs text-muted-foreground">Documento adjunto</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${sol.archivo_url}`}
                      download
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
