'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  DollarSign,
  FileText,
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
    fecha_ingreso: string;
    area?: { id: number; nombre: string };
    cargo?: { id: number; nombre: string };
  };
  periodo_vacacional: {
    id: number;
    numero_periodo: number;
    fecha_inicio_periodo: string;
    fecha_fin_periodo: string;
    fecha_limite_goce: string;
    dias_correspondientes: number;
    dias_gozados: number;
    dias_vendidos: number;
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
  motivo_rechazo?: string;
  motivo_cancelacion?: string;
  fecha_aprobacion_jefe?: string;
  fecha_aprobacion_rrhh?: string;
  fecha_rechazo?: string;
  fecha_cancelacion?: string;
  created_at: string;
  creado_por?: { nombre_completo: string };
  aprobado_por_jefe?: { nombre_completo: string };
  aprobado_por_rrhh?: { nombre_completo: string };
  rechazado_por?: { nombre_completo: string };
  cancelado_por?: { nombre_completo: string };
}

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE_JEFE: 'outline',
  PENDIENTE_RRHH: 'secondary',
  APROBADA: 'default',
  EN_GOCE: 'default',
  GOZADA: 'secondary',
  RECHAZADA: 'destructive',
  CANCELADA: 'destructive',
};

const estadoLabels: Record<string, string> = {
  PENDIENTE_JEFE: 'Pendiente Jefe',
  PENDIENTE_RRHH: 'Pendiente RRHH',
  APROBADA: 'Aprobada',
  EN_GOCE: 'En Goce',
  GOZADA: 'Gozada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function DetalleSolicitudPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSolicitud = async () => {
      try {
        const response = await api.get<Solicitud>(`/vacaciones/solicitudes/${id}`);
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Solicitud #{solicitud.id}</h1>
            <p className="text-sm text-muted-foreground">
              Registrada el {new Date(solicitud.created_at).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={estadoBadgeVariant[solicitud.estado]} className="text-sm px-3 py-1">
            {estadoLabels[solicitud.estado]}
          </Badge>
          {solicitud.estado === 'PENDIENTE_JEFE' && (
            <Button onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${id}/aprobar`)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprobar (Jefe)
            </Button>
          )}
          {solicitud.estado === 'PENDIENTE_RRHH' && (
            <Button onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${id}/validar`)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Validar (RRHH)
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Información del Empleado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Empleado
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Nombre completo</p>
                <p className="font-medium">
                  {solicitud.empleado.nombres} {solicitud.empleado.apellido_paterno}{' '}
                  {solicitud.empleado.apellido_materno}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="font-medium">{solicitud.empleado.numero_documento}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-medium">{solicitud.empleado.area?.nombre || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">{solicitud.empleado.cargo?.nombre || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de ingreso</p>
                <p className="font-medium">
                  {formatDateSafe(solicitud.empleado.fecha_ingreso)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fechas Solicitadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas de Vacaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha inicio solicitada</p>
                  <p className="font-medium">
                    {formatDateSafe(solicitud.fecha_inicio_solicitada)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha fin solicitada</p>
                  <p className="font-medium">
                    {formatDateSafe(solicitud.fecha_fin_solicitada)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días solicitados</p>
                  <p className="font-medium">{solicitud.dias_solicitados} días</p>
                </div>
              </div>

              {fechasModificadas && (
                <>
                  <Separator />
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Fechas modificadas por el supervisor
                    </p>
                    <div className="grid gap-2 md:gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha inicio aprobada</p>
                        <p className="font-medium text-green-600">
                          {formatDateSafe(solicitud.fecha_inicio_aprobada)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha fin aprobada</p>
                        <p className="font-medium text-green-600">
                          {formatDateSafe(solicitud.fecha_fin_aprobada)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Días aprobados</p>
                        <p className="font-medium text-green-600">{solicitud.dias_aprobados} días</p>
                      </div>
                    </div>
                    {solicitud.motivo_modificacion && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground">Motivo de modificación</p>
                        <p className="text-sm">{solicitud.motivo_modificacion}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {solicitud.incluye_venta && (
                <>
                  <Separator />
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
                </>
              )}

              {solicitud.observaciones && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="text-sm mt-1">{solicitud.observaciones}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Estados de Rechazo/Cancelación */}
          {solicitud.estado === 'RECHAZADA' && solicitud.motivo_rechazo && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Solicitud Rechazada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Motivo del rechazo</p>
                <p className="mt-1">{solicitud.motivo_rechazo}</p>
                {solicitud.rechazado_por && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Rechazado por: {solicitud.rechazado_por.nombre_completo} el{' '}
                    {new Date(solicitud.fecha_rechazo!).toLocaleDateString('es-PE')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {solicitud.estado === 'CANCELADA' && solicitud.motivo_cancelacion && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <XCircle className="h-5 w-5" />
                  Solicitud Cancelada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Motivo de cancelación</p>
                <p className="mt-1">{solicitud.motivo_cancelacion}</p>
                {solicitud.cancelado_por && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Cancelado por: {solicitud.cancelado_por.nombre_completo} el{' '}
                    {new Date(solicitud.fecha_cancelacion!).toLocaleDateString('es-PE')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Lateral */}
        <div className="space-y-4 md:space-y-6">
          {/* Período Vacacional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Período Vacacional
              </CardTitle>
              <CardDescription>Período #{solicitud.periodo_vacacional.numero_periodo}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Período laboral</p>
                <p className="text-sm">
                  {formatDateSafe(solicitud.periodo_vacacional.fecha_inicio_periodo)}{' '}
                  - {formatDateSafe(solicitud.periodo_vacacional.fecha_fin_periodo)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha límite de goce</p>
                <p className="text-sm font-medium">
                  {formatDateSafe(solicitud.periodo_vacacional.fecha_limite_goce)}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Correspondientes:</span>
                  <span className="ml-1 font-medium">{solicitud.periodo_vacacional.dias_correspondientes}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gozados:</span>
                  <span className="ml-1 font-medium">{solicitud.periodo_vacacional.dias_gozados}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendidos:</span>
                  <span className="ml-1 font-medium">{solicitud.periodo_vacacional.dias_vendidos}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pendientes:</span>
                  <span className="ml-1 font-medium text-primary">
                    {solicitud.periodo_vacacional.dias_pendientes}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial de Aprobaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Creación */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary"></div>
                  <div className="w-0.5 flex-1 bg-border"></div>
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">Solicitud registrada</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(solicitud.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {solicitud.creado_por && (
                    <p className="text-xs text-muted-foreground">Por: {solicitud.creado_por.nombre_completo}</p>
                  )}
                </div>
              </div>

              {/* Aprobación Jefe */}
              {solicitud.fecha_aprobacion_jefe && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <div className="w-0.5 flex-1 bg-border"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">
                      {fechasModificadas ? 'Modificado por supervisor' : 'Aprobado por supervisor'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(solicitud.fecha_aprobacion_jefe).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {solicitud.aprobado_por_jefe && (
                      <p className="text-xs text-muted-foreground">
                        Por: {solicitud.aprobado_por_jefe.nombre_completo}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Aprobación RRHH */}
              {solicitud.fecha_aprobacion_rrhh && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Validado por RRHH</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(solicitud.fecha_aprobacion_rrhh).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {solicitud.aprobado_por_rrhh && (
                      <p className="text-xs text-muted-foreground">
                        Por: {solicitud.aprobado_por_rrhh.nombre_completo}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Estado Pendiente */}
              {solicitud.estado === 'PENDIENTE_JEFE' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pendiente aprobación del supervisor</p>
                  </div>
                </div>
              )}

              {solicitud.estado === 'PENDIENTE_RRHH' && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pendiente validación de RRHH</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
