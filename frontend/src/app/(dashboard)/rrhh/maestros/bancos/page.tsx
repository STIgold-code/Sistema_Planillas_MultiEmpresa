'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
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
import Link from 'next/link';

interface Banco {
  id: number;
  nombre: string;
  codigo: string | null;
  activo: boolean;
}

const bancoSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  codigo: z.string().optional(),
});

type BancoFormValues = z.infer<typeof bancoSchema>;

export default function BancosPage() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null);

  const form = useForm<BancoFormValues>({
    resolver: zodResolver(bancoSchema),
    defaultValues: {
      nombre: '',
      codigo: '',
    },
  });

  const fetchBancos = async () => {
    try {
      const response = await api.get<Banco[]>('/masters/bancos');
      setBancos(response);
    } catch (error) {
      console.error('Error fetching bancos:', error);
      toast.error('Error al cargar los bancos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  const openCreateDialog = () => {
    setSelectedBanco(null);
    form.reset({ nombre: '', codigo: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (banco: Banco) => {
    setSelectedBanco(banco);
    form.reset({ nombre: banco.nombre, codigo: banco.codigo || '' });
    setDialogOpen(true);
  };

  const openDeleteDialog = (banco: Banco) => {
    setSelectedBanco(banco);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: BancoFormValues) => {
    setSaving(true);
    try {
      if (selectedBanco) {
        await api.patch(`/masters/bancos/${selectedBanco.id}`, data);
        toast.success('Banco actualizado correctamente');
      } else {
        await api.post('/masters/bancos', data);
        toast.success('Banco creado correctamente');
      }
      setDialogOpen(false);
      fetchBancos();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el banco');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBanco) return;

    try {
      await api.delete(`/masters/bancos/${selectedBanco.id}`);
      toast.success('Banco eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchBancos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el banco');
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/rrhh/maestros">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Bancos</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Gestiona el catalogo de bancos</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Banco
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Nombre</TableHead>
                  <TableHead className="min-w-[100px]">Codigo</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : bancos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs md:text-sm text-muted-foreground">
                      No hay bancos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  bancos.map((banco) => (
                    <TableRow key={banco.id}>
                      <TableCell className="font-medium text-sm">{banco.nombre}</TableCell>
                      <TableCell className="text-sm">{banco.codigo || '-'}</TableCell>
                      <TableCell className="text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          banco.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {banco.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(banco)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(banco)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogTitle className="text-lg md:text-xl">{selectedBanco ? 'Editar Banco' : 'Nuevo Banco'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedBanco ? 'Modifica los datos del banco' : 'Ingresa los datos del nuevo banco'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Banco de Credito del Peru" className="h-10 md:h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codigo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: BCP" maxLength={10} className="h-10 md:h-11" />
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
                  {selectedBanco ? 'Guardar' : 'Crear'}
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Banco</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar el banco "{selectedBanco?.nombre}"? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
