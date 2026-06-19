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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Rol {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  activo: boolean;
  rol_id: number;
  rol: Rol;
}

const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  nombre_completo: z.string().min(2, 'Minimo 2 caracteres'),
  rol_id: z.string().min(1, 'Seleccione un rol'),
});

const updateUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres').optional().or(z.literal('')),
  nombre_completo: z.string().min(2, 'Minimo 2 caracteres'),
  rol_id: z.string().min(1, 'Seleccione un rol'),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);

  const form = useForm<CreateUserFormValues | UpdateUserFormValues>({
    resolver: zodResolver(selectedUsuario ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre_completo: '',
      rol_id: '',
    },
  });

  const fetchData = async () => {
    try {
      const [usuariosRes, rolesRes] = await Promise.all([
        api.get<{ data: Usuario[]; meta: any }>('/users'),
        api.get<Rol[]>('/roles'),
      ]);
      // El endpoint /users devuelve respuesta paginada { data: [], meta: {} }
      const usuariosData = usuariosRes?.data;
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setSelectedUsuario(null);
    form.reset({ email: '', password: '', nombre_completo: '', rol_id: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    form.reset({
      email: usuario.email,
      password: '',
      nombre_completo: usuario.nombre_completo,
      rol_id: usuario.rol_id.toString(),
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: CreateUserFormValues | UpdateUserFormValues) => {
    setSaving(true);
    try {
      const payload: any = {
        email: data.email,
        nombre_completo: data.nombre_completo,
        rol_id: parseInt(data.rol_id),
      };

      if (data.password) {
        payload.password = data.password;
      }

      if (selectedUsuario) {
        await api.patch(`/users/${selectedUsuario.id}`, payload);
        toast.success('Usuario actualizado correctamente');
      } else {
        payload.password = data.password;
        await api.post('/users', payload);
        toast.success('Usuario creado correctamente');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUsuario) return;

    try {
      await api.delete(`/users/${selectedUsuario.id}`);
      toast.success('Usuario eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el usuario');
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Usuarios</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestiona los usuarios del sistema</p>
        </div>
        <Button onClick={openCreateDialog} disabled={roles.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {roles.length === 0 && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Debes crear al menos un rol antes de crear usuarios.
        </div>
      )}

      <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Nombre</TableHead>
              <TableHead className="min-w-[100px]">Email</TableHead>
              <TableHead className="min-w-[100px]">Rol</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium text-sm">{usuario.nombre_completo}</TableCell>
                  <TableCell className="text-sm">{usuario.email}</TableCell>
                  <TableCell className="text-sm">{usuario.rol?.nombre || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      usuario.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(usuario)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(usuario)}>
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
            <DialogTitle className="text-lg md:text-xl">{selectedUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedUsuario ? 'Modifica los datos del usuario' : 'Ingresa los datos del nuevo usuario'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Juan Perez" />
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="correo@ejemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedUsuario ? 'Nueva Contrasena (dejar vacio para no cambiar)' : 'Contrasena *'}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="******" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rol_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((rol) => (
                          <SelectItem key={rol.id} value={rol.id.toString()}>
                            {rol.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {selectedUsuario ? 'Guardar' : 'Crear'}
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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Usuario</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Estas seguro de eliminar al usuario "{selectedUsuario?.nombre_completo}"? Esta accion no se puede deshacer.
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
