'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Contrato } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths } from 'date-fns';
import { formatDateSafe, parseDateLocal, toDateString } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const renovarSchema = z.object({
  tipo_contrato: z.string().min(1, 'El tipo de contrato es requerido'),
  modalidad: z.string().optional(),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().optional(),
  renovar: z.boolean(),
  remuneracion: z.number().optional(),
  observaciones: z.string().optional(),
  archivo_url: z.string().optional(),
  empresa_cliente: z.string().optional(),
});

type RenovarForm = z.infer<typeof renovarSchema>;

const TIPOS_CONTRATO = [
  'Plazo Fijo',
  'Plazo Indeterminado',
  'Locacion de Servicios',
  'Por Inicio de Actividad',
  'Por Necesidad de Mercado',
  'Por Obra Determinada',
  'Por Servicio Especifico',
  'Tiempo Parcial',
  'A Domicilio',
  'Teletrabajo',
];

const MODALIDADES = [
  'Presencial',
  'Remoto',
  'Hibrido',
  'Por Turnos',
];

export default function RenovarContratoPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RenovarForm>({
    resolver: zodResolver(renovarSchema),
    defaultValues: {
      tipo_contrato: '',
      modalidad: '',
      fecha_inicio: '',
      fecha_fin: '',
      renovar: false,
      observaciones: '',
      archivo_url: '',
      empresa_cliente: '',
    },
  });

  const fetchContrato = async () => {
    setLoading(true);
    try {
      const data = await api.get<Contrato>(`/contratos/${id}`);

      if (data.estado !== 'ACTIVO' && data.estado !== 'PENDIENTE') {
        toast.error('Solo se pueden renovar contratos vigentes o vencidos');
        router.push(`/rrhh/contratos/${id}`);
        return;
      }

      setContrato(data);

      // Pre-llenar el formulario: inicio = día siguiente al fin actual, fin = 6 meses después
      const fechaFinActual = data.fecha_fin
        ? parseDateLocal(data.fecha_fin)
        : new Date();
      const fechaInicio = new Date(fechaFinActual);
      fechaInicio.setDate(fechaInicio.getDate() + 1); // Día siguiente
      const fechaFin = addMonths(fechaInicio, 6);

      reset({
        tipo_contrato: data.tipo_contrato,
        modalidad: data.modalidad || '',
        fecha_inicio: toDateString(fechaInicio),
        fecha_fin: toDateString(fechaFin),
        renovar: data.renovar,
        remuneracion: data.remuneracion ? Number(data.remuneracion) : undefined,
        empresa_cliente: data.empresa_cliente || '',
        observaciones: '',
      });
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

  const onSubmit = async (data: RenovarForm) => {
    setSaving(true);
    try {
      await api.post(`/contratos/${id}/renovar`, {
        ...data,
        empleado_id: contrato?.empleado_id,
        remuneracion: data.remuneracion ? Number(data.remuneracion) : undefined,
      });
      toast.success('Contrato renovado correctamente');
      router.push('/rrhh/contratos');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al renovar el contrato'));
    } finally {
      setSaving(false);
    }
  };

  const getNombreCompleto = (empleado: Contrato['empleado']) => {
    if (!empleado) return '-';
    return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/rrhh/contratos/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Renovar Contrato
          </h1>
          <p className="text-muted-foreground">
            Renovacion del contrato #{contrato.id}
          </p>
        </div>
      </div>

      {/* Info del contrato actual */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Contrato Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 text-sm">
          <div>
            <Label className="text-muted-foreground">Empleado</Label>
            <p className="font-medium">{getNombreCompleto(contrato.empleado)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Tipo</Label>
            <p className="font-medium">{contrato.tipo_contrato}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Vigencia</Label>
            <p className="font-medium">
              {formatDateSafe(contrato.fecha_inicio)} - {' '}
              {contrato.fecha_fin ? formatDateSafe(contrato.fecha_fin) : 'Indefinido'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Remuneracion</Label>
            <p className="font-medium">
              {contrato.remuneracion
                ? `S/ ${Number(contrato.remuneracion).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del Nuevo Contrato</CardTitle>
            <CardDescription>
              Se creará un nuevo contrato y el actual se marcará como RENOVADO. Podrás ver el historial completo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_contrato">Tipo de Contrato *</Label>
              <Controller
                name="tipo_contrato"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CONTRATO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipo_contrato && (
                <p className="text-sm text-red-500">{errors.tipo_contrato.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalidad">Modalidad</Label>
              <Controller
                name="modalidad"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la modalidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map((mod) => (
                        <SelectItem key={mod} value={mod}>
                          {mod}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
              <Input type="date" {...register('fecha_inicio')} />
              {errors.fecha_inicio && (
                <p className="text-sm text-red-500">{errors.fecha_inicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha de Fin</Label>
              <Input type="date" {...register('fecha_fin')} />
              <p className="text-xs text-muted-foreground">Dejar vacío para contrato indefinido</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remuneracion">Remuneracion (S/)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('remuneracion', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa_cliente">Empresa Cliente</Label>
              <Input
                placeholder="Si aplica intermediacion laboral"
                {...register('empresa_cliente')}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 md:gap-4">
              <Controller
                name="renovar"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label>Marcar para renovacion automatica</Label>
                  </div>
                )}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                placeholder="Notas adicionales sobre la renovacion..."
                rows={3}
                {...register('observaciones')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 md:gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/rrhh/contratos/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Renovar Contrato
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
