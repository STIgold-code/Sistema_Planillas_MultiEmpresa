'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import Link from 'next/link';

interface Area {
  id: number;
  nombre: string;
  activo: boolean;
}

const areaSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
});

type AreaFormValues = z.infer<typeof areaSchema>;

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const { empresa } = useEmpresa();

  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nombre: '',
    },
  });

  const fetchAreas = async () => {
    try {
      const response = await api.get<Area[]>('/masters/areas');
      setAreas(response);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast.error('Error al cargar las areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const openCreateDialog = () => {
    setSelectedArea(null);
    form.reset({ nombre: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (area: Area) => {
    setSelectedArea(area);
    form.reset({ nombre: area.nombre });
    setDialogOpen(true);
  };

  const openDeleteDialog = (area: Area) => {
    setSelectedArea(area);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: AreaFormValues) => {
    if (!empresa) {
      toast.error('Error: No se pudo obtener la información de la empresa');
      return;
    }
    setSaving(true);
    try {
      if (selectedArea) {
        await api.patch(`/masters/areas/${selectedArea.id}`, data);
        toast.success('Area actualizada correctamente');
      } else {
        await api.post('/masters/areas', { ...data, empresa_id: empresa.id });
        toast.success('Area creada correctamente');
      }
      setDialogOpen(false);
      fetchAreas();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar el area'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedArea) return;

    try {
      await api.delete(`/masters/areas/${selectedArea.id}`);
      toast.success('Area eliminada correctamente');
      setDeleteDialogOpen(false);
      fetchAreas();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el area'));
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header section - responsive flex */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/rrhh/maestros">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Areas</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Gestiona las areas de la empresa</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span>Nueva Area</span>
        </Button>
      </div>

      {/* Table with horizontal scroll on mobile */}
      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nombre</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[120px] w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : areas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-xs md:text-sm text-muted-foreground">
                      No hay areas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium text-sm">{area.nombre}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          area.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {area.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(area)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(area)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
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
            <DialogTitle className="text-lg md:text-xl">
              {selectedArea ? 'Editar Area' : 'Nueva Area'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedArea ? 'Modifica los datos del area' : 'Ingresa los datos de la nueva area'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Operaciones" className="h-10 md:h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedArea ? 'Guardar' : 'Crear'}
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Area</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar el area &quot;{selectedArea?.nombre}&quot;? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
