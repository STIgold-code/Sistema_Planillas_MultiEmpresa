'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { features } from '@/lib/features';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CarnetSucamec, EstadoCarnetSucamec, CategoriaSucamec } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  User,
  IdCard,
  Info,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateSafe, parseDateLocal } from '@/lib/utils';

const estadoBadgeVariant: Record<EstadoCarnetSucamec, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  VIGENTE: 'default',
  VENCIDO: 'destructive',
  SUSPENDIDO: 'secondary',
  ANULADO: 'outline',
};

const estadoLabels: Record<EstadoCarnetSucamec, string> = {
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  SUSPENDIDO: 'Suspendido',
  ANULADO: 'Anulado',
};

const categoriaLabels: Record<CategoriaSucamec, string> = {
  BASICO: 'Basico - Agente de seguridad basico',
  ESPECIALIZADO: 'Especializado - Manejo de armas, explosivos',
  RESGUARDO: 'Resguardo - Resguardo personal',
  PROTECCION: 'Proteccion - Proteccion de instalaciones',
  TRANSPORTE: 'Transporte - Transporte de valores',
  TECNOLOGIA: 'Tecnologia - Vigilancia electronica',
  CAPACITADOR: 'Capacitador - Instructor',
};

// Guarda de ruta: con SUCAMEC oculto (NEXT_PUBLIC_FF_SUCAMEC != true) la URL
// directa devuelve 404 en vez de renderizar una página sin backend.
export default function SucamecDetallePage() {
  if (!features.sucamec) {
    notFound();
  }
  return <SucamecDetalleContent />;
}

function SucamecDetalleContent() {
  const router = useRouter();
  const params = useParams(); 
  const id = Number(params.id);

  const [carnet, setCarnet] = useState<CarnetSucamec | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCarnet = async () => {
    setLoading(true);
    try {
      const data = await api.get<CarnetSucamec>(`/sucamec/${id}`);
      setCarnet(data);
    } catch (error) {
      console.error('Error fetching carnet SUCAMEC:', error);
      toast.error('Error al cargar el carnet SUCAMEC');
      router.push('/rrhh/sucamec');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCarnet();
    }
  }, [id]);

  const getNombreCompleto = (empleado: CarnetSucamec['empleado']) => {
    if (!empleado) return '-';
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
  };

  const getDiasRestantes = () => {
    if (!carnet?.fecha_vencimiento) return null;
    // Parsear la fecha como fecha local (no UTC) para evitar desfase de zona horaria
    const [year, month, day] = carnet.fecha_vencimiento.split('T')[0].split('-').map(Number);
    const fechaLocal = new Date(year, month - 1, day);
    return differenceInDays(fechaLocal, startOfDay(new Date()));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!carnet) {
    return null;
  }

  const diasRestantes = getDiasRestantes();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rrhh/sucamec">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold">Carnet #{carnet.numero_carnet}</h1>
              <Badge variant={estadoBadgeVariant[carnet.estado]}>
                {estadoLabels[carnet.estado]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {getNombreCompleto(carnet.empleado)}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {carnet.documento && (
            <Button variant="outline" asChild>
              <a href={carnet.documento.archivo_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Documento
              </a>
            </Button>
          )}
          {carnet.empleado_id && (
            <Button variant="outline" asChild>
              <Link href={`/rrhh/empleados/${carnet.empleado_id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Ficha del Empleado
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Modo de solo lectura</p>
            <p>Para editar, renovar o gestionar este carnet, ve a la ficha del empleado (Empleados → {getNombreCompleto(carnet.empleado)} → Tab SUCAMEC).</p>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de vencimiento */}
      {carnet.estado === 'VIGENTE' && diasRestantes !== null && diasRestantes <= 30 && (
        <div className={`p-4 rounded-md ${diasRestantes <= 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className={`font-medium ${diasRestantes <= 0 ? 'text-red-800' : 'text-yellow-800'}`}>
            {diasRestantes <= 0
              ? 'Este carnet SUCAMEC ha vencido'
              : `Este carnet vence en ${diasRestantes} dias (${format(parseDateLocal(carnet.fecha_vencimiento), "dd 'de' MMMM 'de' yyyy", { locale: es })})`}
          </p>
        </div>
      )}

      {/* Alerta de suspension */}
      {carnet.estado === 'SUSPENDIDO' && (
        <div className="p-4 rounded-md bg-orange-50 border border-orange-200">
          <p className="font-medium text-orange-800">
            Este carnet esta suspendido temporalmente. El empleado no puede ejercer funciones de seguridad.
          </p>
        </div>
      )}

      {/* Alerta de anulacion */}
      {carnet.estado === 'ANULADO' && (
        <div className="p-4 rounded-md bg-gray-50 border border-gray-300">
          <p className="font-medium text-gray-800">
            Este carnet ha sido anulado permanentemente. No puede ser reactivado.
          </p>
        </div>
      )}

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="empleado">Empleado</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                Datos del Carnet SUCAMEC
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Numero de Carnet</Label>
                <p className="font-medium font-mono">{carnet.numero_carnet}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Categoria</Label>
                <p className="font-medium">{categoriaLabels[carnet.categoria] || carnet.categoria}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha de Emision</Label>
                <p className="font-medium">
                  {formatDateSafe(carnet.fecha_emision)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha de Vencimiento</Label>
                <p className="font-medium">
                  {formatDateSafe(carnet.fecha_vencimiento)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Dias Restantes</Label>
                <p className={`font-medium ${
                  diasRestantes === null
                    ? ''
                    : diasRestantes <= 0
                    ? 'text-red-600'
                    : diasRestantes <= 30
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {carnet.estado !== 'VIGENTE'
                    ? 'N/A (carnet no vigente)'
                    : diasRestantes === null
                    ? '-'
                    : diasRestantes <= 0
                    ? 'Vencido'
                    : `${diasRestantes} dias`}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Estado</Label>
                <div>
                  <Badge variant={estadoBadgeVariant[carnet.estado]} className="text-sm">
                    {estadoLabels[carnet.estado]}
                  </Badge>
                </div>
              </div>

              {carnet.documento && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Documento Vinculado</Label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={carnet.documento.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {carnet.documento.archivo_nombre || 'Documento adjunto'}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <Label className="text-muted-foreground">Observaciones</Label>
                <p className="text-sm whitespace-pre-wrap">
                  {carnet.observaciones || 'Sin observaciones'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informacion del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Creado</Label>
                <p>{format(new Date(carnet.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Actualizado</Label>
                <p>{format(new Date(carnet.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Registrado por</Label>
                <p>{carnet.usuario?.nombre_completo || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empleado">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos del Empleado
              </CardTitle>
              <CardDescription>
                Informacion del empleado asociado a este carnet SUCAMEC
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre Completo</Label>
                <p className="font-medium">{getNombreCompleto(carnet.empleado)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Documento</Label>
                <p className="font-medium font-mono">
                  {carnet.empleado?.tipo_documento}: {carnet.empleado?.numero_documento}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Area</Label>
                <p className="font-medium">{carnet.empleado?.area?.nombre || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cargo</Label>
                <p className="font-medium">{carnet.empleado?.cargo?.nombre || '-'}</p>
              </div>
              <div className="md:col-span-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/rrhh/empleados/${carnet.empleado_id}`}>
                    Ver Ficha Completa del Empleado
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
