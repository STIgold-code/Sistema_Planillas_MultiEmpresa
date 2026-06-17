'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe, parseDateLocal } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Edit,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Solicitud {
  id: number;
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    area?: { nombre: string };
    cargo?: { nombre: string };
  };
  periodo_vacacional: {
    id: number;
    numero_periodo: number;
    dias_pendientes: number;
  };
  fecha_inicio_solicitada: string;
  fecha_fin_solicitada: string;
  dias_solicitados: number;
  estado: string;
  incluye_venta: boolean;
  dias_venta: number;
  observaciones?: string;
}

type AccionType = 'APROBAR' | 'MODIFICAR' | 'RECHAZAR';

export default function AprobarSolicitudPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [accion, setAccion] = useState<AccionType>('APROBAR');
  const [fechaInicioAprobada, setFechaInicioAprobada] = useState('');
  const [fechaFinAprobada, setFechaFinAprobada] = useState('');
  const [diasAprobados, setDiasAprobados] = useState(0);
  const [motivoModificacion, setMotivoModificacion] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [comentarioJefe, setComentarioJefe] = useState('');

  useEffect(() => {
    const fetchSolicitud = async () => {
      try {
        const response = await api.get<Solicitud>(`/vacaciones/solicitudes/${id}`);

        if (response.estado !== 'PENDIENTE_JEFE') {
          toast.error('Esta solicitud no está pendiente de aprobación');
          router.push(`/rrhh/vacaciones/solicitudes/${id}`);
          return;
        }

        setSolicitud(response);
        setFechaInicioAprobada(response.fecha_inicio_solicitada.split('T')[0]);
        setFechaFinAprobada(response.fecha_fin_solicitada.split('T')[0]);
        setDiasAprobados(response.dias_solicitados);
      } catch (error) {
        console.error('Error fetching solicitud:', error);
        toast.error('Error al cargar la solicitud');
        router.push('/rrhh/vacaciones/solicitudes');
      } finally {
        setLoading(false);
      }
    };
    fetchSolicitud();
  }, [id, router]);

  // Calcular días cuando cambian las fechas
  useEffect(() => {
    if (fechaInicioAprobada && fechaFinAprobada) {
      const inicio = parseDateLocal(fechaInicioAprobada);
      const fin = parseDateLocal(fechaFinAprobada);
      const diffTime = fin.getTime() - inicio.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDiasAprobados(diffDays > 0 ? diffDays : 0);
    }
  }, [fechaInicioAprobada, fechaFinAprobada]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accion === 'MODIFICAR' && !motivoModificacion.trim()) {
      toast.error('Debe indicar el motivo de la modificación');
      return;
    }

    if (accion === 'RECHAZAR' && !motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }

    if (accion === 'MODIFICAR' && diasAprobados > (solicitud?.periodo_vacacional.dias_pendientes || 0)) {
      toast.error(`Solo hay ${solicitud?.periodo_vacacional.dias_pendientes} días disponibles`);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/vacaciones/solicitudes/${id}/aprobar-jefe`, {
        accion,
        ...(accion === 'MODIFICAR' && {
          fecha_inicio_aprobada: fechaInicioAprobada,
          fecha_fin_aprobada: fechaFinAprobada,
          dias_aprobados: diasAprobados,
          motivo_modificacion: motivoModificacion,
        }),
        ...(accion === 'RECHAZAR' && {
          motivo_rechazo: motivoRechazo,
        }),
        comentario_jefe: comentarioJefe || undefined,
      });

      const mensajes = {
        APROBAR: 'Solicitud aprobada correctamente',
        MODIFICAR: 'Solicitud modificada y aprobada correctamente',
        RECHAZAR: 'Solicitud rechazada',
      };
      toast.success(mensajes[accion]);
      router.push(`/rrhh/vacaciones/solicitudes/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!solicitud) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Aprobar Solicitud</h1>
          <p className="text-sm text-muted-foreground">
            Revisión como supervisor / jefe de área
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Info del Empleado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Empleado Solicitante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {solicitud.empleado.nombres} {solicitud.empleado.apellido_paterno}{' '}
                    {solicitud.empleado.apellido_materno}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {solicitud.empleado.numero_documento}
                    {solicitud.empleado.area && ` - ${solicitud.empleado.area.nombre}`}
                    {solicitud.empleado.cargo && ` - ${solicitud.empleado.cargo.nombre}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fechas Solicitadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas Solicitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Fecha inicio</p>
                  <p className="font-medium">
                    {formatDateSafe(solicitud.fecha_inicio_solicitada)}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Fecha fin</p>
                  <p className="font-medium">
                    {formatDateSafe(solicitud.fecha_fin_solicitada)}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Días solicitados</p>
                  <p className="font-medium">{solicitud.dias_solicitados} días</p>
                </div>
              </div>
              {solicitud.observaciones && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Observaciones del empleado</p>
                  <p className="text-sm mt-1">{solicitud.observaciones}</p>
                </div>
              )}
              {solicitud.incluye_venta && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Incluye venta de {solicitud.dias_venta} días
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acción */}
          <Card>
            <CardHeader>
              <CardTitle>Decisión</CardTitle>
              <CardDescription>Seleccione la acción a realizar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <RadioGroup
                value={accion}
                onValueChange={(value) => setAccion(value as AccionType)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="APROBAR" id="aprobar" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="aprobar" className="flex items-center gap-2 cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Aprobar
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aprobar las fechas tal como fueron solicitadas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="MODIFICAR" id="modificar" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="modificar" className="flex items-center gap-2 cursor-pointer">
                      <Edit className="h-4 w-4 text-yellow-600" />
                      Modificar fechas
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Proponer fechas alternativas y aprobar
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="RECHAZAR" id="rechazar" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="rechazar" className="flex items-center gap-2 cursor-pointer">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Rechazar
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rechazar la solicitud de vacaciones
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Campos para MODIFICAR */}
              {accion === 'MODIFICAR' && (
                <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Ingrese las nuevas fechas</span>
                  </div>
                  <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_inicio_aprobada">Nueva fecha de inicio</Label>
                      <Input
                        id="fecha_inicio_aprobada"
                        type="date"
                        value={fechaInicioAprobada}
                        onChange={(e) => setFechaInicioAprobada(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin_aprobada">Nueva fecha de fin</Label>
                      <Input
                        id="fecha_fin_aprobada"
                        type="date"
                        value={fechaFinAprobada}
                        onChange={(e) => setFechaFinAprobada(e.target.value)}
                        min={fechaInicioAprobada}
                        required
                      />
                    </div>
                  </div>
                  {diasAprobados > 0 && (
                    <div className="p-2 bg-white dark:bg-gray-800 rounded text-sm">
                      <span className="text-muted-foreground">Días resultantes: </span>
                      <span className="font-medium">{diasAprobados} días</span>
                      {diasAprobados > solicitud.periodo_vacacional.dias_pendientes && (
                        <span className="text-red-500 ml-2">
                          (Excede los {solicitud.periodo_vacacional.dias_pendientes} disponibles)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="motivo_modificacion">Motivo de la modificación *</Label>
                    <Textarea
                      id="motivo_modificacion"
                      placeholder="Explique por qué se modifican las fechas..."
                      value={motivoModificacion}
                      onChange={(e) => setMotivoModificacion(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Campos para RECHAZAR */}
              {accion === 'RECHAZAR' && (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Indique el motivo del rechazo</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motivo_rechazo">Motivo del rechazo *</Label>
                    <Textarea
                      id="motivo_rechazo"
                      placeholder="Explique por qué se rechaza la solicitud..."
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Comentario opcional */}
              <div className="space-y-2">
                <Label htmlFor="comentario_jefe">Comentario adicional (opcional)</Label>
                <Textarea
                  id="comentario_jefe"
                  placeholder="Agregue un comentario si lo desea..."
                  value={comentarioJefe}
                  onChange={(e) => setComentarioJefe(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Lateral */}
        <div className="space-y-4 md:space-y-6">
          {/* Resumen del Período */}
          <Card>
            <CardHeader>
              <CardTitle>Período Vacacional</CardTitle>
              <CardDescription>Período #{solicitud.periodo_vacacional.numero_periodo}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {solicitud.periodo_vacacional.dias_pendientes}
                </p>
                <p className="text-sm text-muted-foreground">días disponibles</p>
              </div>
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                type="submit"
                className={`w-full ${
                  accion === 'RECHAZAR'
                    ? 'bg-red-600 hover:bg-red-700'
                    : accion === 'MODIFICAR'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : ''
                }`}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accion === 'APROBAR' && (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprobar Solicitud
                  </>
                )}
                {accion === 'MODIFICAR' && (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Modificar y Aprobar
                  </>
                )}
                {accion === 'RECHAZAR' && (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar Solicitud
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
