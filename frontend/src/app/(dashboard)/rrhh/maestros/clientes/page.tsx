'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Search, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import Link from 'next/link';

interface Cliente {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  activo: boolean;
  _count?: {
    contratos: number;
  };
}

interface ClientesResponse {
  data: Cliente[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const clienteSchema = z.object({
  ruc: z.string().length(11, 'El RUC debe tener 11 digitos').regex(/^\d+$/, 'Solo numeros'),
  razon_social: z.string().min(2, 'Minimo 2 caracteres').max(200),
  nombre_comercial: z.string().max(200).optional().or(z.literal('')),
  direccion: z.string().max(300).optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  contacto_nombre: z.string().max(200).optional().or(z.literal('')),
  contacto_telefono: z.string().max(20).optional().or(z.literal('')),
  contacto_email: z.string().email('Email invalido').optional().or(z.literal('')),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function ClientesPage() {
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      ruc: '',
      razon_social: '',
      nombre_comercial: '',
      direccion: '',
      telefono: '',
      email: '',
      contacto_nombre: '',
      contacto_telefono: '',
      contacto_email: '',
    },
  });

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      const buscar = getFilter('buscar');
      if (buscar) params.append('buscar', buscar);

      const response = await api.get<ClientesResponse>(`/clientes?${params.toString()}`);
      setClientes(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchClientes(); }, [filterParams]);

  const openCreateDialog = () => {
    setSelectedCliente(null);
    form.reset({
      ruc: '',
      razon_social: '',
      nombre_comercial: '',
      direccion: '',
      telefono: '',
      email: '',
      contacto_nombre: '',
      contacto_telefono: '',
      contacto_email: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    form.reset({
      ruc: cliente.ruc,
      razon_social: cliente.razon_social,
      nombre_comercial: cliente.nombre_comercial || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      contacto_nombre: cliente.contacto_nombre || '',
      contacto_telefono: cliente.contacto_telefono || '',
      contacto_email: cliente.contacto_email || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: ClienteFormValues) => {
    setSaving(true);
    try {
      // Limpiar campos vacios
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '')
      );

      if (selectedCliente) {
        await api.patch(`/clientes/${selectedCliente.id}`, cleanData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await api.post('/clientes', cleanData);
        toast.success('Cliente creado correctamente');
      }
      setDialogOpen(false);
      fetchClientes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar el cliente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;

    try {
      await api.delete(`/clientes/${selectedCliente.id}`);
      toast.success('Cliente eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchClientes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el cliente'));
    }
  };

  const handleToggleActivo = async (cliente: Cliente) => {
    try {
      await api.patch(`/clientes/${cliente.id}/toggle-activo`, {});
      toast.success(`Cliente ${cliente.activo ? 'desactivado' : 'activado'} correctamente`);
      fetchClientes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cambiar estado'));
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
            <h1 className="text-xl md:text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Empresas donde se destaca personal</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUC o razon social..."
                value={buscarInput}
                onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">RUC</TableHead>
                <TableHead className="min-w-[150px]">Razon Social</TableHead>
                <TableHead className="min-w-[150px]">Contacto</TableHead>
                <TableHead className="min-w-[150px]">Contratos</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay clientes registrados
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-mono">{cliente.ruc}</TableCell>
                    <TableCell className="text-sm max-w-[220px]" title={cliente.razon_social}>
                      <div className="truncate">
                        <p className="font-medium truncate">{cliente.razon_social}</p>
                        {cliente.nombre_comercial && (
                          <p className="text-sm text-muted-foreground truncate">{cliente.nombre_comercial}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px]" title={cliente.contacto_nombre || undefined}>
                      {cliente.contacto_nombre ? (
                        <div className="text-sm">
                          <p className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 shrink-0" /> {cliente.contacto_nombre}
                          </p>
                          {cliente.contacto_telefono && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" /> {cliente.contacto_telefono}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary">{cliente._count?.contratos || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        variant={cliente.activo ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActivo(cliente)}
                      >
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(cliente)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(cliente)}
                          disabled={(cliente._count?.contratos || 0) > 0}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginacion */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {clientes.length} de {meta.total} clientes
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 text-sm">
              Pagina {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedCliente ? 'Modifica los datos del cliente' : 'Ingresa los datos del nuevo cliente'}
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
                        <Input {...field} placeholder="20123456789" maxLength={11} />
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
                      <FormLabel>Razon Social *</FormLabel>
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
                    <FormLabel>Nombre Comercial</FormLabel>
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
                    <FormLabel>Direccion</FormLabel>
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
                      <FormLabel>Telefono</FormLabel>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contacto@empresa.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Datos del Contacto Principal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="contacto_nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Juan Perez" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contacto_telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="987 654 321" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contacto_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="juan@empresa.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedCliente ? 'Guardar' : 'Crear'}
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar el cliente &quot;{selectedCliente?.razon_social}&quot;? Esta accion no se puede deshacer.
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
