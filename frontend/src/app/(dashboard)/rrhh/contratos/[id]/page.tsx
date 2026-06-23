'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Contrato, EstadoContrato } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  User,
  FileText,
  Info,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatDateSafe, parseDateLocal } from '@/lib/utils';

const estadoBadgeVariant: Record<EstadoContrato, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVO: 'default',
  PENDIENTE: 'secondary',
  RENOVADO: 'secondary',
  CESADO: 'destructive',
  ANULADO: 'outline',
};

const estadoBadgeClass: Record<EstadoContrato, string> = {
  ACTIVO: '',
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80',
  RENOVADO: '',
  CESADO: '',
  ANULADO: 'bg-red-50 text-red-700 border-red-200 line-through hover:bg-red-50/80',
};

const estadoLabels: Record<EstadoContrato, string> = {
  ACTIVO: 'Activo',
  PENDIENTE: 'Pendiente',
  RENOVADO: 'Renovado',
  CESADO: 'Cesado',
  ANULADO: 'Anulado',
};

export default function ContratoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchContrato = async () => {
    setLoading(true);
    try {
      const data = await api.get<Contrato>(`/contratos/${id}`);
      setContrato(data);
    } catch (error) {
      console.error('Error fetching contrato:', error);
      toast.error('Error al cargar el contrato');
      router.push('/rrhh/contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchContrato();
    }
    // Carga inicial al resolver el id; fetchContrato no es dependencia para evitar refetch en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getNombreCompleto = (empleado: Contrato['empleado']) => {
    if (!empleado) return '-';
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
  };

  const getDiasRestantes = () => {
    if (!contrato?.fecha_fin) return null;
    // Parsear la fecha como fecha local (no UTC) para evitar desfase de zona horaria
    const [year, month, day] = contrato.fecha_fin.split('T')[0].split('-').map(Number);
    const fechaFinLocal = new Date(year, month - 1, day);
    return differenceInDays(fechaFinLocal, startOfDay(new Date()));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!contrato) {
    return null;
  }

  const diasRestantes = getDiasRestantes();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rrhh/contratos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold">Contrato #{contrato.id}</h1>
              <Badge variant={estadoBadgeVariant[contrato.estado]} className={cn(estadoBadgeClass[contrato.estado])}>
                {estadoLabels[contrato.estado]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {getNombreCompleto(contrato.empleado)}
            </p>
          </div>
        </div>
        {contrato.empleado_id && (
          <Button variant="outline" asChild>
            <Link href={`/rrhh/empleados/${contrato.empleado_id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Ficha del Empleado
            </Link>
          </Button>
        )}
      </div>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Modo de solo lectura</p>
            <p>Para editar, renovar o terminar este contrato, ve a la ficha del empleado (Empleados → {getNombreCompleto(contrato.empleado)} → Tab Contratos).</p>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de vencimiento */}
      {contrato.estado === 'ACTIVO' && diasRestantes !== null && diasRestantes <= 30 && (
        <div className={`p-4 rounded-md ${diasRestantes <= 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className={`font-medium ${diasRestantes <= 0 ? 'text-red-800' : 'text-yellow-800'}`}>
            {diasRestantes <= 0
              ? 'Este contrato ha vencido'
              : `Este contrato vence en ${diasRestantes} dias (${format(parseDateLocal(contrato.fecha_fin!), "dd 'de' MMMM 'de' yyyy", { locale: es })})`}
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
                <FileText className="h-5 w-5" />
                Datos del Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tipo de Contrato</Label>
                <p className="font-medium">{contrato.tipo_contrato}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Modalidad</Label>
                <p className="font-medium">{contrato.modalidad || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha de Inicio</Label>
                <p className="font-medium">
                  {formatDateSafe(contrato.fecha_inicio)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha de Fin</Label>
                <p className="font-medium">
                  {contrato.fecha_fin
                    ? formatDateSafe(contrato.fecha_fin)
                    : 'Indefinido'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Remuneracion</Label>
                <p className="font-medium">
                  {contrato.remuneracion
                    ? `S/ ${Number(contrato.remuneracion).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                    : '-'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Empresa Cliente</Label>
                <p className="font-medium">{contrato.empresa_cliente || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Lugar de Trabajo</Label>
                <p className="font-medium">{contrato.lugar_trabajo || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Renovacion Automatica</Label>
                <p className="font-medium">{contrato.renovar ? 'Si' : 'No'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Nº de Renovacion</Label>
                <p className="font-medium text-lg">{contrato.numero_renovacion || 1}</p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-muted-foreground">Observaciones</Label>
                <p className="text-sm whitespace-pre-wrap">
                  {contrato.observaciones || 'Sin observaciones'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informacion de Cese - solo para contratos TERMINADO */}
          {contrato.estado === 'CESADO' && (
            <Card className="border-rose-200 bg-rose-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700">
                  <Info className="h-5 w-5" />
                  Informacion de Cese
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Fecha de Cese</Label>
                  <p className="font-medium">
                    {contrato.fecha_cese ? formatDateSafe(contrato.fecha_cese) : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informacion del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Creado</Label>
                <p>{format(new Date(contrato.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Actualizado</Label>
                <p>{format(new Date(contrato.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Registrado por</Label>
                <p>{contrato.usuario?.nombre_completo || '-'}</p>
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
                Informacion del empleado asociado a este contrato
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nombre Completo</Label>
                <p className="font-medium">{getNombreCompleto(contrato.empleado)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Documento</Label>
                <p className="font-medium font-mono">
                  {contrato.empleado?.tipo_documento}: {contrato.empleado?.numero_documento}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Area</Label>
                <p className="font-medium">{contrato.empleado?.area?.nombre || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cargo</Label>
                <p className="font-medium">{contrato.empleado?.cargo?.nombre || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Fecha de Ingreso</Label>
                <p className="font-medium">
                  {contrato.empleado?.fecha_ingreso
                    ? formatDateSafe(contrato.empleado.fecha_ingreso)
                    : '-'}
                </p>
              </div>
              <div className="md:col-span-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/rrhh/empleados/${contrato.empleado_id}`}>
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
