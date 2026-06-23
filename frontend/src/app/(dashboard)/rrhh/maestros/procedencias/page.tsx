'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

interface Procedencia {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  _count: {
    postulantes: number;
  };
}

const procedenciaSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  descripcion: z.string().max(300, 'Maximo 300 caracteres').optional(),
});

type ProcedenciaFormValues = z.infer<typeof procedenciaSchema>;

export default function ProcedenciasPage() {
  const [procedencias, setProcedencias] = useState<Procedencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProcedencia, setSelectedProcedencia] = useState<Procedencia | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const form = useForm<ProcedenciaFormValues>({
    resolver: zodResolver(procedenciaSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

  const fetchProcedencias = async () => {
    try {
      const params = showInactive ? '?incluir_inactivos=true' : '';
      const response = await api.get<Procedencia[]>(`/masters/procedencias${params}`);
      setProcedencias(response);
    } catch (error) {
      console.error('Error fetching procedencias:', error);
      toast.error('Error al cargar las procedencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedencias();
    // Recarga al cambiar el filtro; fetchProcedencias no es dependencia para evitar refetch en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const openCreateDialog = () => {
    setSelectedProcedencia(null);
    form.reset({
      nombre: '',
      descripcion: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (procedencia: Procedencia) => {
    setSelectedProcedencia(procedencia);
    form.reset({
      nombre: procedencia.nombre,
      descripcion: procedencia.descripcion || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (procedencia: Procedencia) => {
    setSelectedProcedencia(procedencia);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: ProcedenciaFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        descripcion: data.descripcion || null,
      };

      if (selectedProcedencia) {
        await api.patch(`/masters/procedencias/${selectedProcedencia.id}`, payload);
        toast.success('Procedencia actualizada correctamente');
      } else {
        await api.post('/masters/procedencias', payload);
        toast.success('Procedencia creada correctamente');
      }
      setDialogOpen(false);
      fetchProcedencias();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar la procedencia'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProcedencia) return;

    try {
      await api.delete(`/masters/procedencias/${selectedProcedencia.id}`);
      toast.success('Procedencia eliminada correctamente');
      setDeleteDialogOpen(false);
      fetchProcedencias();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la procedencia'));
    }
  };

  const handleToggle = async (procedencia: Procedencia) => {
    try {
      await api.patch(`/masters/procedencias/${procedencia.id}/toggle`, {});
      toast.success(procedencia.activo ? 'Procedencia desactivada' : 'Procedencia activada');
      fetchProcedencias();
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
            <h1 className="text-xl md:text-2xl font-bold">Procedencias</h1>
            <p className="text-muted-foreground">Gestiona las fuentes de reclutamiento de postulantes</p>
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
            Nueva Procedencia
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Nombre</TableHead>
              <TableHead className="min-w-[150px]">Descripcion</TableHead>
              <TableHead className="w-[100px]">Postulantes</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : procedencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay procedencias registradas
                </TableCell>
              </TableRow>
            ) : (
              procedencias.map((procedencia) => (
                <TableRow key={procedencia.id} className={!procedencia.activo ? 'opacity-50' : ''}>
                  <TableCell className="font-medium text-sm">{procedencia.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                    {procedencia.descripcion || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{procedencia._count.postulantes}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant={procedencia.activo ? 'default' : 'outline'}>
                      {procedencia.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(procedencia)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(procedencia)}
                        title={procedencia.activo ? 'Desactivar' : 'Activar'}
                      >
                        <Power className={`h-4 w-4 ${procedencia.activo ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                      {procedencia._count.postulantes === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(procedencia)}
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
            <DialogTitle className="text-lg md:text-xl">{selectedProcedencia ? 'Editar Procedencia' : 'Nueva Procedencia'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedProcedencia ? 'Modifica los datos de la procedencia' : 'Ingresa los datos de la nueva procedencia'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Computrabajo, LinkedIn, Recomendado" />
                    </FormControl>
                    <FormDescription>Nombre de la fuente de reclutamiento</FormDescription>
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
                      <Textarea {...field} placeholder="Descripcion de la procedencia..." rows={2} />
                    </FormControl>
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
                  {selectedProcedencia ? 'Guardar' : 'Crear'}
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Procedencia</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar la procedencia &quot;{selectedProcedencia?.nombre}&quot;? Esta accion no se puede deshacer.
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
