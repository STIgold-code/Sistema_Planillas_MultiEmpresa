'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import Link from 'next/link';

interface TipoCese {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

const tipoCeseSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  descripcion: z.string().optional(),
});

type TipoCeseFormValues = z.infer<typeof tipoCeseSchema>;

export default function TiposCesePage() {
  const [tipos, setTipos] = useState<TipoCese[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoCese | null>(null);
  const form = useForm<TipoCeseFormValues>({
    resolver: zodResolver(tipoCeseSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

  const fetchTipos = async () => {
    try {
      const response = await api.get<TipoCese[]>('/masters/tipos-cese');
      setTipos(response);
    } catch (error) {
      console.error('Error fetching tipos de cese:', error);
      toast.error('Error al cargar los tipos de cese');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const openCreateDialog = () => {
    setSelectedTipo(null);
    form.reset({ nombre: '', descripcion: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (tipo: TipoCese) => {
    setSelectedTipo(tipo);
    form.reset({ nombre: tipo.nombre, descripcion: tipo.descripcion || '' });
    setDialogOpen(true);
  };

  const openDeleteDialog = (tipo: TipoCese) => {
    setSelectedTipo(tipo);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: TipoCeseFormValues) => {
    setSaving(true);
    try {
      if (selectedTipo) {
        await api.patch(`/masters/tipos-cese/${selectedTipo.id}`, data);
        toast.success('Tipo de cese actualizado correctamente');
      } else {
        await api.post('/masters/tipos-cese', data);
        toast.success('Tipo de cese creado correctamente');
      }
      setDialogOpen(false);
      fetchTipos();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el tipo de cese');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTipo) return;

    try {
      await api.delete(`/masters/tipos-cese/${selectedTipo.id}`);
      toast.success('Tipo de cese eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchTipos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el tipo de cese');
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/rrhh/maestros">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Tipos de Cese</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Gestiona los tipos de cese de la empresa</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span>Nuevo Tipo</span>
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Nombre</TableHead>
                  <TableHead className="min-w-[200px]">Descripcion</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[120px] w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : tipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs md:text-sm text-muted-foreground">
                      No hay tipos de cese registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  tipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium text-sm">{tipo.nombre}</TableCell>
                      <TableCell className="text-sm">{tipo.descripcion || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          tipo.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(tipo)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(tipo)} className="h-8 w-8">
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
        <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {selectedTipo ? 'Editar Tipo de Cese' : 'Nuevo Tipo de Cese'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedTipo ? 'Modifica los datos del tipo de cese' : 'Ingresa los datos del nuevo tipo de cese'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Renuncia voluntaria" className="h-10 md:h-11" />
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
                    <FormLabel className="text-sm">Descripcion</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripcion del tipo de cese" rows={3} className="resize-none" />
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Tipo de Cese</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar el tipo "{selectedTipo?.nombre}"? Esta accion no se puede deshacer.
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
