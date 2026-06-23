'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SolicitudExtension {
  id: number;
  empresa_id: number;
  periodo_id: number;
  usuario_id: number;
  sesion_tareo_id: number;
  motivo: string;
  tiempo_solicitado_min: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  aprobado_por_id: number | null;
  fecha_solicitud: string;
  fecha_respuesta: string | null;
  comentario_respuesta: string | null;
  usuario?: {
    id: number;
    nombre_completo: string;
    email: string;
  };
  periodo?: {
    id: number;
    anio: number;
    mes: number;
  };
}

interface SolicitudesExtensionPanelProps {
  periodoId?: number; // Si se pasa, filtra por período
  onSolicitudResuelta?: () => void;
}

export function SolicitudesExtensionPanel({
  periodoId,
  onSolicitudResuelta,
}: SolicitudesExtensionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<SolicitudExtension[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudExtension | null>(null);
  const [showResponderModal, setShowResponderModal] = useState(false);
  const [accion, setAccion] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR');
  const [comentario, setComentario] = useState('');
  const [procesando, setProcesando] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (periodoId) params.append('periodo_id', periodoId.toString());
      params.append('estado', 'PENDIENTE');

      const response = await api.get<{ data: SolicitudExtension[]; meta: unknown }>(
        `/tareo/extensiones?${params.toString()}`
      );
      setSolicitudes(response.data || []);
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      toast.error('Error al cargar las solicitudes');
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, [periodoId]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleResponder = (solicitud: SolicitudExtension, accionTipo: 'APROBAR' | 'RECHAZAR') => {
    setSelectedSolicitud(solicitud);
    setAccion(accionTipo);
    setComentario('');
    setShowResponderModal(true);
  };

  const handleConfirmarRespuesta = async () => {
    if (!selectedSolicitud) return;

    setProcesando(true);
    try {
      await api.patch(`/tareo/extensiones/${selectedSolicitud.id}`, {
        accion,
        comentario: comentario.trim() || undefined,
      });

      toast.success(
        accion === 'APROBAR'
          ? 'Solicitud aprobada. Se ha creado una nueva sesión para el usuario.'
          : 'Solicitud rechazada.'
      );

      setShowResponderModal(false);
      fetchSolicitudes();
      onSolicitudResuelta?.();
    } catch (error) {
      console.error('Error al responder solicitud:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'APROBADA':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'RECHAZADA':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazada
          </Badge>
        );
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  // No mostrar nada mientras carga o si no hay solicitudes pendientes
  if (loading || solicitudes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Solicitudes de Extensión
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  {solicitudes.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-amber-600">
                Requieren tu atención
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSolicitudes} className="border-amber-300 hover:bg-amber-100">
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tiempo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitudes.map((solicitud) => (
                    <TableRow key={solicitud.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {solicitud.usuario?.nombre_completo || `Usuario ${solicitud.usuario_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {solicitud.usuario?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {solicitud.periodo
                              ? `${solicitud.periodo.mes}/${solicitud.periodo.anio}`
                              : `ID: ${solicitud.periodo_id}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {solicitud.tiempo_solicitado_min} min
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(solicitud.fecha_solicitud), 'dd/MM HH:mm', {
                            locale: es,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleResponder(solicitud, 'APROBAR')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleResponder(solicitud, 'RECHAZAR')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <Dialog open={showResponderModal} onOpenChange={setShowResponderModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {accion === 'APROBAR' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Aprobar Solicitud
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rechazar Solicitud
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {accion === 'APROBAR'
                ? 'Se creará una nueva sesión de tareo para el usuario.'
                : 'El usuario no podrá continuar editando el tareo.'}
            </DialogDescription>
          </DialogHeader>

          {selectedSolicitud && (
            <div className="space-y-4 py-4">
              {/* Detalles de la solicitud */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedSolicitud.usuario?.nombre_completo || `Usuario ${selectedSolicitud.usuario_id}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Solicita <strong>{selectedSolicitud.tiempo_solicitado_min} minutos</strong>{' '}
                    adicionales
                  </span>
                </div>
              </div>

              {/* Motivo del usuario */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Motivo del usuario
                </Label>
                <div className="bg-muted/30 rounded-lg p-3 text-sm border">
                  {selectedSolicitud.motivo}
                </div>
              </div>

              {/* Comentario de respuesta */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Comentario (opcional)
                </Label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder={
                    accion === 'APROBAR'
                      ? 'Agregar un comentario para el usuario...'
                      : 'Explica el motivo del rechazo...'
                  }
                  rows={3}
                  className="resize-none"
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowResponderModal(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarRespuesta}
              disabled={procesando}
              className={cn(
                accion === 'APROBAR'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accion === 'APROBAR' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
