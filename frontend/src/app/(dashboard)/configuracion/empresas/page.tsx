'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import {
  REGIMENES_LISTA,
  REGIMENES_LABORALES,
  obtenerRegimenInfo,
  type RegimenLaboral,
} from '@/lib/regimenes';

interface Empresa {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  regimen_laboral_default: RegimenLaboral | null;
  activo: boolean;
}

const empresaSchema = z.object({
  ruc: z
    .string()
    .length(11, 'El RUC debe tener 11 dígitos')
    .regex(/^\d+$/, 'Solo se permiten números'),
  razon_social: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  nombre_comercial: z.string().max(200).optional().or(z.literal('')),
  direccion: z.string().max(300).optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  regimen_laboral_default: z.enum(REGIMENES_LABORALES).optional().or(z.literal('')),
  activo: z.boolean(),
});

type EmpresaFormValues = z.infer<typeof empresaSchema>;

const VALORES_INICIALES: EmpresaFormValues = {
  ruc: '',
  razon_social: '',
  nombre_comercial: '',
  direccion: '',
  telefono: '',
  email: '',
  regimen_laboral_default: '',
  activo: true,
};

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: VALORES_INICIALES,
  });

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const data = await api.get<Empresa[]>('/companies');
      setEmpresas(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar las empresas'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const abrirDialogoCrear = () => {
    setEmpresaSeleccionada(null);
    form.reset(VALORES_INICIALES);
    setDialogOpen(true);
  };

  const abrirDialogoEditar = (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa);
    form.reset({
      ruc: empresa.ruc,
      razon_social: empresa.razon_social,
      nombre_comercial: empresa.nombre_comercial ?? '',
      direccion: empresa.direccion ?? '',
      telefono: empresa.telefono ?? '',
      email: empresa.email ?? '',
      regimen_laboral_default: empresa.regimen_laboral_default ?? '',
      activo: empresa.activo,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EmpresaFormValues) => {
    setSaving(true);
    try {
      // Convierte cadenas vacías de los campos opcionales en ausencia del campo,
      // para no enviar "" donde el backend espera un valor válido o nada.
      const payload = {
        ruc: data.ruc,
        razon_social: data.razon_social,
        nombre_comercial: data.nombre_comercial || undefined,
        direccion: data.direccion || undefined,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        regimen_laboral_default: data.regimen_laboral_default || undefined,
        activo: data.activo,
      };

      if (empresaSeleccionada) {
        await api.patch(`/companies/${empresaSeleccionada.id}`, payload);
        toast.success('Empresa actualizada correctamente');
      } else {
        await api.post('/companies', payload);
        toast.success('Empresa creada correctamente');
      }
      setDialogOpen(false);
      fetchEmpresas();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar la empresa'));
    } finally {
      setSaving(false);
    }
  };

  const regimenSeleccionado = form.watch('regimen_laboral_default');
  const infoRegimen = obtenerRegimenInfo(regimenSeleccionado || null);

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Empresas</h1>
            <p className="text-muted-foreground text-sm">
              Administra las empresas que gestiona el estudio.
            </p>
          </div>
        </div>
        <Button onClick={abrirDialogoCrear}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva empresa
        </Button>
      </div>

      <Card className="flex-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px]">RUC</TableHead>
                <TableHead className="min-w-[180px]">Razón social</TableHead>
                <TableHead className="min-w-[160px]">Nombre comercial</TableHead>
                <TableHead className="min-w-[180px]">Régimen por defecto</TableHead>
                <TableHead className="min-w-[90px]">Estado</TableHead>
                <TableHead className="w-[80px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : empresas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium">No hay empresas registradas</p>
                      <p className="text-sm text-muted-foreground">
                        Crea la primera empresa para empezar a gestionarla.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={abrirDialogoCrear}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva empresa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                empresas.map((empresa) => {
                  const regimen = obtenerRegimenInfo(empresa.regimen_laboral_default);
                  return (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-mono text-sm">{empresa.ruc}</TableCell>
                      <TableCell
                        className="text-sm max-w-[240px]"
                        title={empresa.razon_social}
                      >
                        <p className="font-medium truncate">{empresa.razon_social}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                        <span className="truncate block">
                          {empresa.nombre_comercial || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {regimen ? (
                          <Badge variant="secondary">{regimen.labelCorto}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={empresa.activo ? 'default' : 'secondary'}>
                          {empresa.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDialogoEditar(empresa)}
                          aria-label={`Editar ${empresa.razon_social}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {empresaSeleccionada ? 'Editar empresa' : 'Nueva empresa'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {empresaSeleccionada
                ? 'Modifica los datos de la empresa.'
                : 'Ingresa los datos de la nueva empresa.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <FormField
                  control={form.control}
                  name="ruc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUC *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="20123456789"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="razon_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón social *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Empresa S.A.C." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nombre_comercial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre comercial</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre comercial (opcional)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Av. Principal 123, Lima" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="01 234 5678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="contacto@empresa.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="regimen_laboral_default"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Régimen laboral por defecto</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un régimen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIMENES_LISTA.map((regimen) => (
                          <SelectItem key={regimen.value} value={regimen.value}>
                            {regimen.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {infoRegimen
                        ? infoRegimen.implicaciones
                        : 'Régimen aplicado por defecto a los contratos de esta empresa. El contrato puede sobrescribirlo.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Empresa activa</FormLabel>
                      <FormDescription>
                        Las empresas inactivas no aparecen en los procesos operativos.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Empresa activa"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {empresaSeleccionada ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
