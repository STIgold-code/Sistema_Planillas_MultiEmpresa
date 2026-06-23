'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FormDescription,
} from '@/components/ui/form';
import { Plus, Pencil, Trash2, Loader2, FileText, Calendar, CalendarClock, CalendarOff } from 'lucide-react';
import { toast } from 'sonner';
import { TipoDocumentoEmpleado, TipoVigenciaDocumento } from '@/types';
import { getApiErrorMessage } from '@/lib/errors';

const TIPO_VIGENCIA_OPTIONS: { value: TipoVigenciaDocumento; label: string; description: string }[] = [
  { value: 'SIN_FECHAS', label: 'Sin fechas', description: 'No requiere fechas (CV, foto)' },
  { value: 'SOLO_EMISION', label: 'Solo emision', description: 'Solo fecha de emision (contratos)' },
  { value: 'CON_VENCIMIENTO', label: 'Con vencimiento', description: 'Emision + vencimiento (DNI, antecedentes)' },
];

const tipoDocSchema = z.object({
  codigo: z.string().min(1, 'Requerido').max(20, 'Maximo 20 caracteres'),
  nombre: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  descripcion: z.string().max(300, 'Maximo 300 caracteres').optional().or(z.literal('')),
  orden: z.number().int().min(0),
  activo: z.boolean(),
  es_obligatorio: z.boolean(),
  aplica_seleccion: z.boolean(),
  aplica_rrhh: z.boolean(),
  tipo_vigencia: z.enum(['SIN_FECHAS', 'SOLO_EMISION', 'CON_VENCIMIENTO']),
  dias_alerta: z.number().int().min(1).nullable().optional(),
});

type TipoDocFormValues = z.infer<typeof tipoDocSchema>;

export default function TiposDocumentoEmpleadoPage() {
  const [tipos, setTipos] = useState<TipoDocumentoEmpleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumentoEmpleado | null>(null);
  const { empresa } = useEmpresa();

  const form = useForm<TipoDocFormValues>({
    resolver: zodResolver(tipoDocSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      orden: 0,
      activo: true,
      es_obligatorio: false,
      aplica_seleccion: false,
      aplica_rrhh: false,
      tipo_vigencia: 'SIN_FECHAS',
      dias_alerta: null,
    },
  });

  const tipoVigencia = useWatch({ control: form.control, name: 'tipo_vigencia' });

  const fetchTipos = async () => {
    try {
      const response = await api.get<TipoDocumentoEmpleado[]>('/masters/tipos-documento-empleado');
      setTipos(response);
    } catch (error) {
      console.error('Error fetching tipos:', error);
      toast.error('Error al cargar los tipos de documento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, []);

  const openCreateDialog = () => {
    setSelectedTipo(null);
    form.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      orden: tipos.length > 0 ? Math.max(...tipos.map(t => t.orden)) + 1 : 1,
      activo: true,
      es_obligatorio: false,
      aplica_seleccion: false,
      aplica_rrhh: false,
      tipo_vigencia: 'SIN_FECHAS',
      dias_alerta: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tipo: TipoDocumentoEmpleado) => {
    setSelectedTipo(tipo);
    form.reset({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      orden: tipo.orden,
      activo: tipo.activo,
      es_obligatorio: tipo.es_obligatorio || false,
      aplica_seleccion: tipo.aplica_seleccion || false,
      aplica_rrhh: tipo.aplica_rrhh || false,
      tipo_vigencia: tipo.tipo_vigencia || 'SIN_FECHAS',
      dias_alerta: tipo.dias_alerta || null,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (tipo: TipoDocumentoEmpleado) => {
    setSelectedTipo(tipo);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: TipoDocFormValues) => {
    if (!empresa) {
      toast.error('Error: No se pudo obtener la información de la empresa');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        empresa_id: empresa.id,
        // Limpiar dias_alerta si no es CON_VENCIMIENTO
        dias_alerta: data.tipo_vigencia === 'CON_VENCIMIENTO' ? data.dias_alerta : null,
      };

      if (selectedTipo) {
        await api.patch(`/masters/tipos-documento-empleado/${selectedTipo.id}`, payload);
        toast.success('Tipo de documento actualizado correctamente');
      } else {
        await api.post('/masters/tipos-documento-empleado', payload);
        toast.success('Tipo de documento creado correctamente');
      }
      setDialogOpen(false);
      fetchTipos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar el tipo de documento'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTipo) return;

    try {
      await api.delete(`/masters/tipos-documento-empleado/${selectedTipo.id}`);
      toast.success('Tipo de documento eliminado correctamente');
      setDeleteDialogOpen(false);
      fetchTipos();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el tipo de documento'));
    }
  };

  const getVigenciaIcon = (tipo: TipoVigenciaDocumento) => {
    switch (tipo) {
      case 'CON_VENCIMIENTO':
        return <CalendarClock className="h-3 w-3" />;
      case 'SOLO_EMISION':
        return <Calendar className="h-3 w-3" />;
      default:
        return <CalendarOff className="h-3 w-3" />;
    }
  };

  const getVigenciaLabel = (tipo: TipoVigenciaDocumento) => {
    return TIPO_VIGENCIA_OPTIONS.find(o => o.value === tipo)?.label || tipo;
  };

  const getVigenciaBadgeClass = (tipo: TipoVigenciaDocumento) => {
    switch (tipo) {
      case 'CON_VENCIMIENTO':
        return 'bg-orange-100 text-orange-700';
      case 'SOLO_EMISION':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Tipos de Documento de Empleado</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gestiona las categorias de documentos que se pueden cargar para los empleados</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
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
              <TableHead className="w-[90px] text-center">Obligatorio</TableHead>
              <TableHead className="w-[90px] text-center">Seleccion</TableHead>
              <TableHead className="w-[90px] text-center">RRHH</TableHead>
              <TableHead className="w-[130px]">Vigencia</TableHead>
              <TableHead className="w-[80px]">Alerta</TableHead>
              <TableHead className="w-[80px]">Docs</TableHead>
              <TableHead className="w-[80px]">Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                  No hay tipos de documento registrados
                </TableCell>
              </TableRow>
            ) : (
              tipos.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="text-center">{tipo.orden}</TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-mono">
                      <FileText className="h-3 w-3" />
                      {tipo.codigo}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{tipo.nombre}</TableCell>
                  <TableCell className="text-center">
                    {tipo.es_obligatorio ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Si
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {tipo.aplica_seleccion ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        Si
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {tipo.aplica_rrhh ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        Si
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getVigenciaBadgeClass(tipo.tipo_vigencia)}`}>
                      {getVigenciaIcon(tipo.tipo_vigencia)}
                      {getVigenciaLabel(tipo.tipo_vigencia)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {tipo.tipo_vigencia === 'CON_VENCIMIENTO' && tipo.dias_alerta ? (
                      <span className="text-orange-600">{tipo.dias_alerta}d</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{tipo._count?.documentos || 0}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      tipo.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(tipo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(tipo)}
                        disabled={(tipo._count?.documentos || 0) > 0}
                        title={(tipo._count?.documentos || 0) > 0 ? 'No se puede eliminar, tiene documentos asociados' : 'Eliminar'}
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
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedTipo ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedTipo ? 'Modifica los datos del tipo de documento' : 'Ingresa los datos del nuevo tipo de documento'}
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
                      <FormLabel>Codigo *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: CV" className="uppercase" />
                      </FormControl>
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
                        <Input
                          type="number"
                          min={0}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
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
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Curriculum Vitae" />
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
                      <Textarea {...field} placeholder="Descripcion del tipo de documento" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_vigencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vigencia *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo de vigencia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPO_VIGENCIA_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Define que fechas se solicitaran al cargar este documento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tipoVigencia === 'CON_VENCIMIENTO' && (
                <FormField
                  control={form.control}
                  name="dias_alerta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias de anticipacion para alerta</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Ej: 30"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseInt(val, 10));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Dias antes del vencimiento para mostrar alerta (vacio = 30 dias por defecto)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="es_obligatorio"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Obligatorio</FormLabel>
                        <FormDescription>
                          Requerido para que el empleado este completo
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aplica_seleccion"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Aplica a Seleccion</FormLabel>
                        <FormDescription>
                          Disponible al subir docs de postulantes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aplica_rrhh"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Aplica a RRHH</FormLabel>
                        <FormDescription>
                          Aparece en la ficha del empleado
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Activo</FormLabel>
                        <FormDescription>
                          Los tipos inactivos no aparecen al subir documentos
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

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
            <AlertDialogTitle className="text-lg md:text-xl">Eliminar Tipo de Documento</AlertDialogTitle>
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
