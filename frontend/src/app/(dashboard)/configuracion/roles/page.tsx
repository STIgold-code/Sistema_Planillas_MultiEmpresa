'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Loader2, Shield, ChevronDown, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
  activo: boolean;
  _count?: { usuarios: number };
}

interface PermisoItem {
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface PermisoGrupo {
  modulo: string;
  descripcion: string;
  permisos: PermisoItem[];
}

const rolSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  descripcion: z.string().optional(),
});

type RolFormValues = z.infer<typeof rolSchema>;

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState<PermisoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
  const [expandedModulos, setExpandedModulos] = useState<string[]>([]);

  const form = useForm<RolFormValues>({
    resolver: zodResolver(rolSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

  const fetchRoles = async () => {
    try {
      const response = await api.get<Rol[]>('/roles');
      // Verificación defensiva: asegurar que sea un array
      setRoles(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Error al cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermisos = async () => {
    try {
      const response = await api.get<PermisoGrupo[]>('/roles/permisos-disponibles');
      // Verificación defensiva: asegurar que sea un array
      setPermisosDisponibles(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching permisos:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermisos();
  }, []);

  const openCreateDialog = () => {
    setSelectedRol(null);
    setSelectedPermisos([]);
    setExpandedModulos([]);
    form.reset({ nombre: '', descripcion: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (rol: Rol) => {
    setSelectedRol(rol);
    setSelectedPermisos(rol.permisos || []);
    // Expandir modulos que tienen permisos seleccionados
    const modulosConPermisos = permisosDisponibles
      .filter(grupo => grupo.permisos.some(p => rol.permisos?.includes(p.codigo)))
      .map(g => g.modulo);
    setExpandedModulos(modulosConPermisos);
    form.reset({ nombre: rol.nombre, descripcion: rol.descripcion || '' });
    setDialogOpen(true);
  };

  const openDeleteDialog = (rol: Rol) => {
    setSelectedRol(rol);
    setDeleteDialogOpen(true);
  };

  const togglePermiso = (permiso: string) => {
    setSelectedPermisos((prev) =>
      prev.includes(permiso) ? prev.filter((p) => p !== permiso) : [...prev, permiso]
    );
  };

  const toggleModulo = (permisos: PermisoItem[]) => {
    const codigos = permisos.map(p => p.codigo);
    const allSelected = codigos.every((c) => selectedPermisos.includes(c));
    if (allSelected) {
      setSelectedPermisos((prev) => prev.filter((p) => !codigos.includes(p)));
    } else {
      setSelectedPermisos((prev) => [...new Set([...prev, ...codigos])]);
    }
  };

  const toggleExpanded = (modulo: string) => {
    setExpandedModulos(prev =>
      prev.includes(modulo) ? prev.filter(m => m !== modulo) : [...prev, modulo]
    );
  };

  const getModuloPermisosCount = (grupo: PermisoGrupo) => {
    const total = grupo.permisos.length;
    const selected = grupo.permisos.filter(p => selectedPermisos.includes(p.codigo)).length;
    return { total, selected };
  };

  const onSubmit = async (data: RolFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        permisos: selectedPermisos,
      };

      if (selectedRol) {
        await api.patch(`/roles/${selectedRol.id}`, payload);
        toast.success('Rol actualizado correctamente');
      } else {
        await api.post('/roles', payload);
        toast.success('Rol creado correctamente');
      }
      setDialogOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el rol');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRol) return;

    try {
      await api.delete(`/roles/${selectedRol.id}`);
      toast.success('Rol eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el rol');
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 md:gap-6 min-h-full">
        <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Roles</h1>
            <p className="text-muted-foreground">Gestiona los roles y permisos del sistema</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        </div>

        <div className="flex-1 overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden md:rounded-lg border-0 md:border">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Nombre</TableHead>
                <TableHead className="min-w-[150px]">Descripcion</TableHead>
                <TableHead className="min-w-[150px]">Permisos</TableHead>
                <TableHead className="min-w-[150px]">Usuarios</TableHead>
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
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay roles registrados
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((rol) => (
                  <TableRow key={rol.id}>
                    <TableCell className="font-medium text-sm">{rol.nombre}</TableCell>
                    <TableCell className="text-sm">{rol.descripcion || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {rol.permisos?.includes('*') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                          <Shield className="h-3 w-3" />
                          Todos los permisos
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{rol.permisos?.length || 0} permisos</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-sm">{rol._count?.usuarios || 0}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        rol.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {rol.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rol)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(rol)}
                          disabled={(rol._count?.usuarios ?? 0) > 0}
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
            </div>
          </div>
        </div>

        {/* Dialog Crear/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">{selectedRol ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
              <DialogDescription className="text-sm">
                {selectedRol ? 'Modifica los datos del rol' : 'Ingresa los datos del nuevo rol'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Supervisor" />
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
                        <FormLabel>Descripcion</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Descripcion breve del rol" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <FormLabel>Permisos</FormLabel>
                    <span className="text-xs text-muted-foreground">
                      {selectedPermisos.length} seleccionados
                    </span>
                  </div>
                  <div className="rounded-md border divide-y">
                    {permisosDisponibles.map((grupo) => {
                      const { total, selected } = getModuloPermisosCount(grupo);
                      const allSelected = selected === total;
                      const someSelected = selected > 0 && selected < total;
                      const isExpanded = expandedModulos.includes(grupo.modulo);

                      return (
                        <Collapsible
                          key={grupo.modulo}
                          open={isExpanded}
                          onOpenChange={() => toggleExpanded(grupo.modulo)}
                        >
                          <div className="flex items-center gap-3 p-3 hover:bg-muted/50">
                            <Checkbox
                              checked={allSelected}
                              ref={(ref) => {
                                if (ref && someSelected) {
                                  (ref as HTMLButtonElement).dataset.state = 'indeterminate';
                                }
                              }}
                              onCheckedChange={() => toggleModulo(grupo.permisos)}
                            />
                            <CollapsibleTrigger className="flex-1 flex items-center justify-between">
                              <div className="text-left">
                                <span className="font-medium text-sm">{grupo.modulo}</span>
                                <p className="text-xs text-muted-foreground">{grupo.descripcion}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {selected}/{total}
                                </span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 pt-1 ml-7 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {grupo.permisos.map((permiso) => (
                                <div
                                  key={permiso.codigo}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={selectedPermisos.includes(permiso.codigo)}
                                    onCheckedChange={() => togglePermiso(permiso.codigo)}
                                  />
                                  <span className="text-sm flex-1">{permiso.nombre}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[200px]">
                                      <p className="text-xs">{permiso.descripcion}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{permiso.codigo}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedRol ? 'Guardar' : 'Crear'}
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
              <AlertDialogTitle className="text-lg md:text-xl">Eliminar Rol</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                ¿Estas seguro de eliminar el rol "{selectedRol?.nombre}"? Esta accion no se puede deshacer.
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
    </TooltipProvider>
  );
}
