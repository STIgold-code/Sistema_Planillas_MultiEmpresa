'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  ArrowLeft,
  Power,
  User,
  Phone,
  X,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Cliente {
  id: number;
  razon_social: string;
  nombre_comercial?: string;
}

interface SedeContacto {
  id: number;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  es_principal: boolean;
  activo: boolean;
}

interface Sede {
  id: number;
  nombre: string;
  direccion: string | null;
  cliente_id: number;
  activo: boolean;
  cliente: {
    id: number;
    razon_social: string;
    nombre_comercial?: string;
  };
  contactos: SedeContacto[];
  _count: {
    empleados: number;
    tareos: number;
    vacantes: number;
  };
}

interface SedesResponse {
  data: Sede[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const contactoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  cargo: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email invalido').max(100).optional().or(z.literal('')),
  es_principal: z.boolean().optional(),
});

const sedeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  direccion: z.string().max(300).optional(),
  cliente_id: z.number({ message: 'Seleccione un cliente' }),
  activo: z.boolean(),
  contactos: z.array(contactoSchema).optional(),
});

type SedeForm = z.infer<typeof sedeSchema>;

export default function SedesPage() {
  const { getFilter, setFilter, page, setPage, filterParams } = useUrlFilters();
  const [buscarInput, setBuscarInput] = useState(getFilter('buscar'));
  const debouncedSetBuscar = useDebouncedCallback(
    (v: string) => setFilter('buscar', v), 400,
  );

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SedeForm>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      nombre: '',
      direccion: '',
      activo: true,
      contactos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contactos',
  });

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      const buscar = getFilter('buscar');
      const clienteId = getFilter('cliente_id');
      const activo = getFilter('activo');
      if (buscar) params.append('buscar', buscar);
      if (clienteId) params.append('cliente_id', clienteId);
      if (activo) params.append('activo', activo);

      const response = await api.get<SedesResponse>(`/sedes?${params.toString()}`);
      setSedes(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Error fetching sedes:', error);
      toast.error('Error al cargar las sedes');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await api.get<Cliente[]>('/clientes/select');
      setClientes(response);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      setClientes([]);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSedes(); }, [filterParams]);

  const openCreateModal = () => {
    setEditingSede(null);
    reset({ nombre: '', direccion: '', cliente_id: undefined, activo: true, contactos: [] });
    setShowModal(true);
  };

  const openEditModal = (sede: Sede) => {
    setEditingSede(sede);
    reset({
      nombre: sede.nombre,
      direccion: sede.direccion || '',
      cliente_id: sede.cliente_id,
      activo: sede.activo,
      contactos: sede.contactos.map(c => ({
        nombre: c.nombre,
        cargo: c.cargo || '',
        telefono: c.telefono || '',
        email: c.email || '',
        es_principal: c.es_principal,
      })),
    });
    setShowModal(true);
  };

  const onSubmit = async (data: SedeForm) => {
    setSaving(true);
    try {
      const payload = {
        nombre: data.nombre,
        direccion: data.direccion || undefined,
        cliente_id: data.cliente_id,
        activo: data.activo,
        contactos: data.contactos?.filter(c => c.nombre.trim()) || [],
      };

      if (editingSede) {
        // Para editar, no enviamos contactos en el update principal
        const { contactos, ...sedePayload } = payload;
        void contactos;
        await api.patch(`/sedes/${editingSede.id}`, sedePayload);
        toast.success('Sede actualizada correctamente');
      } else {
        await api.post('/sedes', payload);
        toast.success('Sede creada correctamente');
      }
      setShowModal(false);
      fetchSedes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar la sede'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/sedes/${deleteId}`);
      toast.success('Sede eliminada correctamente');
      fetchSedes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la sede'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleToggleActivo = async (sede: Sede) => {
    try {
      await api.patch(`/sedes/${sede.id}/toggle-activo`, {});
      toast.success(`Sede ${sede.activo ? 'desactivada' : 'activada'} correctamente`);
      fetchSedes();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cambiar el estado'));
    }
  };

  const getContactoPrincipal = (sede: Sede) => {
    return sede.contactos.find(c => c.es_principal && c.activo) || sede.contactos.find(c => c.activo);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rrhh/maestros">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Sedes
            </h1>
            <p className="text-muted-foreground">Ubicaciones de clientes donde trabajan los empleados</p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sede
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 md:gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, direccion o cliente..."
            value={buscarInput}
            onChange={(e) => { setBuscarInput(e.target.value); debouncedSetBuscar(e.target.value); }}
            className="pl-10"
          />
        </div>
        <Select value={getFilter('cliente_id')} onValueChange={(v) => setFilter('cliente_id', v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id.toString()}>
                {cliente.nombre_comercial || cliente.razon_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={getFilter('activo')} onValueChange={(v) => setFilter('activo', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto -mx-4 md:mx-0 flex-1">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Sede</TableHead>
              <TableHead className="min-w-[100px]">Cliente</TableHead>
              <TableHead className="min-w-[200px]">Contacto Principal</TableHead>
              <TableHead className="text-center min-w-[150px]">Empleados</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : sedes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay sedes registradas
                </TableCell>
              </TableRow>
            ) : (
              sedes.map((sede) => {
                const contacto = getContactoPrincipal(sede);
                return (
                  <TableRow key={sede.id} className={!sede.activo ? 'opacity-60' : ''}>
                    <TableCell className="text-sm">
                      <div>
                        <p className="font-medium">{sede.nombre}</p>
                        {sede.direccion && (
                          <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                            {sede.direccion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {sede.cliente.nombre_comercial || sede.cliente.razon_social}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {contacto ? (
                        <div className="text-sm">
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {contacto.nombre}
                          </p>
                          {contacto.telefono && (
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {contacto.telefono}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {sede._count.empleados}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={sede.activo ? 'default' : 'secondary'}>
                        {sede.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(sede)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActivo(sede)}
                          title={sede.activo ? 'Desactivar' : 'Activar'}
                        >
                          <Power className={`h-4 w-4 ${sede.activo ? 'text-green-600' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(sede.id)}
                          title="Eliminar"
                          disabled={sede._count.empleados > 0 || sede._count.tareos > 0}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
            </div>
          </div>
        </div>

      {/* Paginacion */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {sedes.length} de {meta.total} sedes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Pagina {page} de {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{editingSede ? 'Editar Sede' : 'Nueva Sede'}</DialogTitle>
            <DialogDescription className="text-sm">
              {editingSede
                ? 'Modifica los datos de la sede'
                : 'Ingresa los datos de la nueva sede'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente *</Label>
                <Controller
                  name="cliente_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v, 10))}
                      value={field.value?.toString() || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id.toString()}>
                            {cliente.nombre_comercial || cliente.razon_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.cliente_id && (
                  <p className="text-sm text-red-500">{errors.cliente_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Sede *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Oficina Principal, Planta Norte"
                  {...register('nombre')}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-500">{errors.nombre.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Direccion</Label>
              <Input
                id="direccion"
                placeholder="Direccion de la sede"
                {...register('direccion')}
              />
            </div>

            {/* Contactos - solo para crear */}
            {!editingSede && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Label>Contactos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ nombre: '', cargo: '', telefono: '', email: '', es_principal: false })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">Contacto {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Nombre *"
                        {...register(`contactos.${index}.nombre`)}
                      />
                      <Input
                        placeholder="Cargo"
                        {...register(`contactos.${index}.cargo`)}
                      />
                      <Input
                        placeholder="Telefono"
                        {...register(`contactos.${index}.telefono`)}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        {...register(`contactos.${index}.email`)}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register(`contactos.${index}.es_principal`)}
                        className="rounded"
                      />
                      Contacto principal
                    </label>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : editingSede ? (
                  'Actualizar'
                ) : (
                  'Crear'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacion de eliminacion */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Sede</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta seguro de eliminar esta sede? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
