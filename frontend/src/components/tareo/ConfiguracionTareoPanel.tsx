'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Settings, Clock, Bell, Shield } from 'lucide-react';

const configuracionSchema = z.object({
  tiempo_limite_minutos: z.number().min(5).max(480),
  requiere_corrector: z.boolean(),
  sesiones_por_dia: z.number().min(1).max(10),
  sesiones_por_periodo: z.number().min(1).max(100).nullable(),
  dias_post_cierre: z.number().min(0).max(30),
  hora_limite_diaria: z.string().nullable(),
  requiere_aprobacion_extension: z.boolean(),
  max_extensiones_periodo: z.number().min(0).max(20),
  notificar_email: z.boolean(),
  notificar_sistema: z.boolean(),
});

type ConfiguracionFormData = z.infer<typeof configuracionSchema>;

interface ConfiguracionTareoPanelProps {
  onConfigUpdate?: () => void;
}

export function ConfiguracionTareoPanel({ onConfigUpdate }: ConfiguracionTareoPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<ConfiguracionFormData>({
    resolver: zodResolver(configuracionSchema),
    defaultValues: {
      tiempo_limite_minutos: 60,
      requiere_corrector: false,
      sesiones_por_dia: 1,
      sesiones_por_periodo: null,
      dias_post_cierre: 5,
      hora_limite_diaria: null,
      requiere_aprobacion_extension: true,
      max_extensiones_periodo: 3,
      notificar_email: true,
      notificar_sistema: true,
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.get<ConfiguracionFormData>('/tareo/sesiones/configuracion');
        form.reset({
          tiempo_limite_minutos: config.tiempo_limite_minutos,
          requiere_corrector: config.requiere_corrector,
          sesiones_por_dia: config.sesiones_por_dia,
          sesiones_por_periodo: config.sesiones_por_periodo,
          dias_post_cierre: config.dias_post_cierre,
          hora_limite_diaria: config.hora_limite_diaria,
          requiere_aprobacion_extension: config.requiere_aprobacion_extension,
          max_extensiones_periodo: config.max_extensiones_periodo,
          notificar_email: config.notificar_email,
          notificar_sistema: config.notificar_sistema,
        });
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        toast.error('Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [form]);

  const onSubmit = async (data: ConfiguracionFormData) => {
    setSaving(true);
    try {
      await api.patch('/tareo/sesiones/configuracion', data);
      toast.success('Configuración guardada correctamente');
      onConfigUpdate?.();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Configuración de Sesiones de Tareo</CardTitle>
        </div>
        <CardDescription>
          Define los parámetros de control de tiempo para la edición del tareo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección: Control de Tiempo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Control de Tiempo
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tiempo_limite_minutos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tiempo por sesión (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormDescription>Duración máxima de cada sesión de edición</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sesiones_por_dia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sesiones por día</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>Número máximo de sesiones diarias</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sesiones_por_periodo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sesiones por período (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Sin límite"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormDescription>Dejar vacío para no limitar</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora_limite_diaria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora límite diaria (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          placeholder="Sin límite"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>Hora máxima para editar cada día</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dias_post_cierre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días post-cierre</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Días para editar después del cierre del período</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Sección: Extensiones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Shield className="h-4 w-4" />
                Control de Extensiones
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requiere_corrector"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Requiere corrector</FormLabel>
                        <FormDescription className="text-xs">
                          Solo usuarios con rol corrector pueden editar sin límite
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiere_aprobacion_extension"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Aprobar extensiones</FormLabel>
                        <FormDescription className="text-xs">
                          Las solicitudes de extensión requieren aprobación
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_extensiones_periodo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo extensiones por período</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>0 = sin límite de extensiones</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Sección: Notificaciones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bell className="h-4 w-4" />
                Notificaciones
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notificar_email"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Notificaciones por email</FormLabel>
                        <FormDescription className="text-xs">
                          Enviar correos a correctores y usuarios
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notificar_sistema"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Notificaciones en sistema</FormLabel>
                        <FormDescription className="text-xs">
                          Mostrar notificaciones en el dashboard
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Configuración
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
