'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Edit,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';

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
  fecha_inicio_aprobada?: string;
  fecha_fin_aprobada?: string;
  dias_aprobados?: number;
  estado: string;
  incluye_venta: boolean;
  dias_venta: number;
  observaciones?: string;
  motivo_modificacion?: string;
  comentario_jefe?: string;
  aprobado_por_jefe?: { nombre_completo: string };
  fecha_aprobacion_jefe?: string;
}

type AccionType = 'VALIDAR' | 'RECHAZAR';

export default function ValidarSolicitudPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [accion, setAccion] = useState<AccionType>('VALIDAR');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [comentarioRrhh, setComentarioRrhh] = useState('');

  useEffect(() => {
    const fetchSolicitud = async () => {
      try {
        const response = await api.get<Solicitud>(`/vacaciones/solicitudes/${id}`);

        if (response.estado !== 'PENDIENTE_RRHH') {
          toast.error('Esta solicitud no está pendiente de validación RRHH');
          router.push(`/rrhh/vacaciones/solicitudes/${id}`);
          return;
        }

        setSolicitud(response);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (accion === 'RECHAZAR' && !motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/vacaciones/solicitudes/${id}/aprobar-rrhh`, {
        accion,
        ...(accion === 'RECHAZAR' && {
          motivo_rechazo: motivoRechazo,
        }),
        comentario_rrhh: comentarioRrhh || undefined,
      });

      toast.success(accion === 'VALIDAR' ? 'Solicitud validada y aprobada' : 'Solicitud rechazada');
      router.push(`/rrhh/vacaciones/solicitudes/${id}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al procesar la solicitud'));
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

  const fechasModificadas =
    solicitud.fecha_inicio_aprobada &&
    (solicitud.fecha_inicio_aprobada !== solicitud.fecha_inicio_solicitada ||
      solicitud.fecha_fin_aprobada !== solicitud.fecha_fin_solicitada);

  const fechaInicio = solicitud.fecha_inicio_aprobada || solicitud.fecha_inicio_solicitada;
  const fechaFin = solicitud.fecha_fin_aprobada || solicitud.fecha_fin_solicitada;
  const diasFinal = solicitud.dias_aprobados || solicitud.dias_solicitados;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Validar Solicitud (RRHH)</h1>
          <p className="text-sm text-muted-foreground">
            Validación final de recursos humanos
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

          {/* Resumen de la Solicitud */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumen de Vacaciones
              </CardTitle>
              <CardDescription>
                Fechas {fechasModificadas ? 'aprobadas por el supervisor' : 'solicitadas'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fecha inicio</p>
                  <p className="font-medium text-primary">
                    {formatDateSafe(fechaInicio)}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fecha fin</p>
                  <p className="font-medium text-primary">
                    {formatDateSafe(fechaFin)}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total días</p>
                  <p className="font-medium text-primary">{diasFinal} días</p>
                </div>
              </div>

              {/* Fechas originales si fueron modificadas */}
              {fechasModificadas && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Fechas modificadas por el supervisor
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Solicitado originalmente:{' '}
                      {formatDateSafe(solicitud.fecha_inicio_solicitada)} -{' '}
                      {formatDateSafe(solicitud.fecha_fin_solicitada)} (
                      {solicitud.dias_solicitados} días)
                    </p>
                    {solicitud.motivo_modificacion && (
                      <p className="mt-2">
                        <span className="font-medium">Motivo:</span> {solicitud.motivo_modificacion}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {solicitud.incluye_venta && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      Venta de vacaciones incluida
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {solicitud.dias_venta} días a vender
                    </p>
                  </div>
                </div>
              )}

              {solicitud.observaciones && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Observaciones del solicitante</p>
                  <p className="text-sm mt-1">{solicitud.observaciones}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aprobación del Jefe */}
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Aprobación del Supervisor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Aprobado por:</span>{' '}
                  <span className="font-medium">{solicitud.aprobado_por_jefe?.nombre_completo}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Fecha:</span>{' '}
                  <span className="font-medium">
                    {new Date(solicitud.fecha_aprobacion_jefe!).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                {solicitud.comentario_jefe && (
                  <p className="text-sm mt-2">
                    <span className="text-muted-foreground">Comentario:</span>{' '}
                    {solicitud.comentario_jefe}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Decisión RRHH */}
          <Card>
            <CardHeader>
              <CardTitle>Decisión RRHH</CardTitle>
              <CardDescription>Validación final de recursos humanos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <RadioGroup
                value={accion}
                onValueChange={(value) => setAccion(value as AccionType)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="VALIDAR" id="validar" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="validar" className="flex items-center gap-2 cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Validar y Aprobar
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      La solicitud cumple con todos los requisitos
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
                      La solicitud no cumple con los requisitos
                    </p>
                  </div>
                </div>
              </RadioGroup>

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
                <Label htmlFor="comentario_rrhh">Comentario RRHH (opcional)</Label>
                <Textarea
                  id="comentario_rrhh"
                  placeholder="Agregue un comentario si lo desea..."
                  value={comentarioRrhh}
                  onChange={(e) => setComentarioRrhh(e.target.value)}
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
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días a descontar:</span>
                  <span className="font-medium">{diasFinal}</span>
                </div>
                {solicitud.incluye_venta && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Días a vender:</span>
                    <span className="font-medium">{solicitud.dias_venta}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo después:</span>
                  <span className="font-medium text-primary">
                    {solicitud.periodo_vacacional.dias_pendientes - diasFinal - (solicitud.dias_venta || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                type="submit"
                className={`w-full ${accion === 'RECHAZAR' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accion === 'VALIDAR' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Validar y Aprobar
                  </>
                ) : (
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
