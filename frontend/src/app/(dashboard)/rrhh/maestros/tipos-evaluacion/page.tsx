'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import Link from 'next/link';

interface TipoEvaluacion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  puntaje_maximo: number | null;
  orden: number;
  activo: boolean;
  _count: {
    evaluaciones: number;
  };
}

const tipoEvaluacionSchema = z.object({
  codigo: z.string().min(2, 'Minimo 2 caracteres').max(20, 'Maximo 20 caracteres'),
  nombre: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  descripcion: z.string().max(500, 'Maximo 500 caracteres').optional(),
  puntaje_maximo: z.coerce.number().min(0).max(100).optional().nullable(),
  orden: z.coerce.number().int().min(0).default(0),
});

type TipoEvaluacionFormValues = z.infer<typeof tipoEvaluacionSchema>;

export default function TiposEvaluacionPage() {
  const [tipos, setTipos] = useState<TipoEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoEvaluacion | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const form = useForm<TipoEvaluacionFormValues>({
    // El schema usa z.coerce + .default(), por lo que el tipo de entrada del
    // resolver difiere del de salida; se fija al tipo de salida del formulario.
    resolver: zodResolver(
      tipoEvaluacionSchema,
    ) as Resolver<TipoEvaluacionFormValues>,
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      puntaje_maximo: null,
      orden: 0,
    },
  });

  const fetchTipos = async () => {
    try {
      const params = showInactive ? '?incluir_inactivos=true' : '';
      const response = await api.get<TipoEvaluacion[]>(`/masters/tipos-evaluacion${params}`);
      setTipos(response);
    } catch (error) {
      console.error('Error fetching tipos:', error);
      toast.error('Error al cargar los tipos de evaluacion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
    // Recarga al cambiar el filtro; fetchTipos no es dependencia para evitar refetch en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const openCreateDialog = () => {
    setSelectedTipo(null);
    form.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      puntaje_maximo: null,
      orden: tipos.length,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tipo: TipoEvaluacion) => {
    setSelectedTipo(tipo);
    form.reset({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      puntaje_maximo: tipo.puntaje_maximo,
      orden: tipo.orden,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (tipo: TipoEvaluacion) => {
    setSelectedTipo(tipo);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: TipoEvaluacionFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        descripcion: data.descripcion || null,
        puntaje_maximo: data.puntaje_maximo || null,
      };

      if (selectedTipo) {
        await api.patch(`/masters/tipos-evaluacion/${selectedTipo.id}`, payload);
        toast.success('Tipo de evaluacion actualizado correctamente');
      } else {
        await api.post('/masters/tipos-evaluacion', payload);
        toast.success('Tipo de evaluacion creado correctamente');
      }
      setDialogOpen(false);
      fetchTipos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar el tipo de evaluacion'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTipo) return;

    try {
      await api.delete(`/masters/tipos-evaluacion/${selectedTipo.id}`);
      toast.success('Tipo de evaluacion eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchTipos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el tipo de evaluacion'));
    }
  };

  const handleToggle = async (tipo: TipoEvaluacion) => {
    try {
      await api.patch(`/masters/tipos-evaluacion/${tipo.id}/toggle`, {});
      toast.success(tipo.activo ? 'Tipo desactivado' : 'Tipo activado');
      fetchTipos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cambiar el estado'));
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/rrhh/maestros">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Tipos de Evaluacion</h1>
            <p className="text-muted-foreground">Gestiona los tipos de evaluacion para el proceso de seleccion</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor="show-inactive" className="text-sm text-muted-foreground cursor-pointer">
              Mostrar inactivos
            </label>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Tipo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Orden</TableHead>
              <TableHead className="w-[100px]">Codigo</TableHead>
              <TableHead className="min-w-[100px]">Nombre</TableHead>
              <TableHead className="min-w-[150px]">Descripcion</TableHead>
              <TableHead className="w-[120px]">Puntaje Max.</TableHead>
              <TableHead className="w-[100px]">Usos</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay tipos de evaluacion registrados
                </TableCell>
              </TableRow>
            ) : (
              tipos.map((tipo) => (
                <TableRow key={tipo.id} className={!tipo.activo ? 'opacity-50' : ''}>
                  <TableCell className="text-center font-mono text-sm">{tipo.orden}</TableCell>
                  <TableCell className="text-sm">
                    <code className="px-2 py-1 bg-muted rounded text-sm">{tipo.codigo}</code>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{tipo.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {tipo.descripcion || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {tipo.puntaje_maximo ? `${tipo.puntaje_maximo}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{tipo._count.evaluaciones}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={tipo.activo ? 'default' : 'outline'}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tipo)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(tipo)}
                        title={tipo.activo ? 'Desactivar' : 'Activar'}
                      >
                        <Power className={`h-4 w-4 ${tipo.activo ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                      {tipo._count.evaluaciones === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tipo)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
            </div>
          </div>
        </div>

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedTipo ? 'Editar Tipo de Evaluacion' : 'Nuevo Tipo de Evaluacion'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedTipo ? 'Modifica los datos del tipo de evaluacion' : 'Ingresa los datos del nuevo tipo de evaluacion'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codigo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: PSIC" className="uppercase" />
                      </FormControl>
                      <FormDescription>Codigo unico para identificar el tipo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="orden"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormDescription>Para ordenar en listas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Evaluacion Psicologica" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripcion (opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripcion del tipo de evaluacion..." rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="puntaje_maximo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntaje Maximo (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Ej: 100"
                      />
                    </FormControl>
                    <FormDescription>Puntaje maximo permitido para este tipo de evaluacion</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedTipo ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Tipo de Evaluacion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar el tipo &quot;{selectedTipo?.nombre}&quot;? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
