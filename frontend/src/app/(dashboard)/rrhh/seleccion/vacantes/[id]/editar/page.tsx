'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Vacante } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Area {
  id: number;
  nombre: string;
}

interface Cargo {
  id: number;
  nombre: string;
}

interface Sede {
  id: number;
  nombre: string;
}

interface Requisito {
  tipo: string;
  descripcion: string;
  obligatorio: boolean;
}

const vacanteSchema = z.object({
  titulo: z.string().min(3, 'El titulo debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  area_id: z.string().optional(),
  cargo_id: z.string().optional(),
  sede_id: z.string().optional(),
  cantidad_puestos: z.string().min(1, 'Ingrese la cantidad de puestos'),
  sueldo_ofrecido: z.string().optional(),
  tipo_contrato: z.string().optional(),
  modalidad: z.string().optional(),
  fecha_cierre: z.string().optional(),
});

type VacanteFormValues = z.infer<typeof vacanteSchema>;

export default function EditarVacantePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [vacante, setVacante] = useState<Vacante | null>(null);
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);

  const form = useForm<VacanteFormValues>({
    resolver: zodResolver(vacanteSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      area_id: '',
      cargo_id: '',
      sede_id: '',
      cantidad_puestos: '1',
      sueldo_ofrecido: '',
      tipo_contrato: '',
      modalidad: '',
      fecha_cierre: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vacanteRes, areasRes, cargosRes, sedesRes] = await Promise.all([
          api.get<Vacante>(`/vacantes/${id}`),
          api.get<Area[]>('/masters/areas'),
          api.get<Cargo[]>('/masters/cargos'),
          api.get<{ data: Sede[] }>('/sedes?limit=100'),
        ]);

        setVacante(vacanteRes);
        setAreas(areasRes);
        setCargos(cargosRes);
        setSedes(sedesRes.data);

        // Pre-fill form with existing data
        form.reset({
          titulo: vacanteRes.titulo,
          descripcion: vacanteRes.descripcion || '',
          area_id: vacanteRes.area_id?.toString() || '',
          cargo_id: vacanteRes.cargo_id?.toString() || '',
          sede_id: vacanteRes.sede_id?.toString() || '',
          cantidad_puestos: vacanteRes.cantidad_puestos.toString(),
          sueldo_ofrecido: vacanteRes.sueldo_ofrecido?.toString() || '',
          tipo_contrato: vacanteRes.tipo_contrato || '',
          modalidad: vacanteRes.modalidad || '',
          fecha_cierre: vacanteRes.fecha_cierre
            ? vacanteRes.fecha_cierre.split('T')[0]
            : '',
        });

        // Load existing requisitos
        if (vacanteRes.requisitos && Array.isArray(vacanteRes.requisitos)) {
          setRequisitos(vacanteRes.requisitos.filter((r): r is { tipo: string; descripcion: string; obligatorio?: boolean } => typeof r !== 'string').map(r => ({
            tipo: r.tipo || 'OTRO',
            descripcion: r.descripcion || '',
            obligatorio: r.obligatorio ?? true,
          })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [id, form]);

  const agregarRequisito = () => {
    setRequisitos([...requisitos, { tipo: 'EXPERIENCIA', descripcion: '', obligatorio: true }]);
  };

  const eliminarRequisito = (index: number) => {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  };

  const actualizarRequisito = (index: number, campo: keyof Requisito, valor: string | boolean) => {
    const nuevosRequisitos = [...requisitos];
    nuevosRequisitos[index] = { ...nuevosRequisitos[index], [campo]: valor };
    setRequisitos(nuevosRequisitos);
  };

  const onSubmit = async (data: VacanteFormValues) => {
    setLoading(true);
    try {
      // Campos siempre editables (cuando el estado lo permite)
      const payload: Record<string, unknown> = {
        descripcion: data.descripcion || undefined,
        sueldo_ofrecido: data.sueldo_ofrecido ? parseFloat(data.sueldo_ofrecido) : undefined,
        fecha_cierre: data.fecha_cierre || undefined,
        requisitos: requisitos.filter(r => r.descripcion.trim()),
      };

      // Campos restringidos: solo enviar en BORRADOR
      if (vacante?.estado === 'BORRADOR') {
        payload.titulo = data.titulo;
        payload.area_id = data.area_id ? parseInt(data.area_id) : undefined;
        payload.cargo_id = data.cargo_id ? parseInt(data.cargo_id) : undefined;
        payload.sede_id = data.sede_id ? parseInt(data.sede_id) : undefined;
        payload.cantidad_puestos = parseInt(data.cantidad_puestos);
        payload.tipo_contrato = data.tipo_contrato || undefined;
        payload.modalidad = data.modalidad || undefined;
      }

      await api.patch(`/vacantes/${id}`, payload);
      toast.success('Vacante actualizada correctamente');
      router.push(`/rrhh/seleccion/vacantes/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la vacante');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vacante) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Vacante no encontrada</p>
      </div>
    );
  }

  // Solo CERRADA y CANCELADA no se pueden editar
  if (vacante.estado === 'CERRADA' || vacante.estado === 'CANCELADA') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pueden editar vacantes cerradas o canceladas</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  const esBorrador = vacante.estado === 'BORRADOR';
  const camposRestringidos = !esBorrador; // Si no es borrador, algunos campos son de solo lectura

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Editar Vacante</h1>
          <p className="text-muted-foreground font-mono">{vacante.codigo}</p>
        </div>
      </div>

      {camposRestringidos && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">Vacante en estado {vacante.estado}</p>
          <p className="text-sm">Solo puedes modificar: descripcion, sueldo ofrecido y fecha de cierre.</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacion de la Vacante</CardTitle>
              <CardDescription>Datos principales del puesto de trabajo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo del Puesto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Analista de Sistemas" disabled={camposRestringidos} />
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
                      <Textarea
                        {...field}
                        placeholder="Describe las funciones y requisitos del puesto"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={camposRestringidos}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id.toString()}>
                              {area.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sede_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sede/Zona Destaque</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={camposRestringidos}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione sede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sedes.map((sede) => (
                            <SelectItem key={sede.id} value={sede.id.toString()}>
                              {sede.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cargo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={camposRestringidos}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cargos.map((cargo) => (
                            <SelectItem key={cargo.id} value={cargo.id.toString()}>
                              {cargo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cantidad_puestos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad de Puestos *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" placeholder="1" disabled={camposRestringidos} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sueldo_ofrecido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sueldo Ofrecido (S/.)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="2500.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha_cierre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Cierre</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tipo_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contrato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={camposRestringidos}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDEFINIDO">Indefinido</SelectItem>
                          <SelectItem value="SUJETO_A_MODALIDAD">Sujeto a Modalidad</SelectItem>
                          <SelectItem value="TEMPORAL">Temporal</SelectItem>
                          <SelectItem value="PRACTICAS">Practicas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modalidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={camposRestringidos}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione modalidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                          <SelectItem value="REMOTO">Remoto</SelectItem>
                          <SelectItem value="HIBRIDO">Hibrido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Requisitos</CardTitle>
                  <CardDescription>Define los requisitos para el puesto</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={agregarRequisito} disabled={camposRestringidos}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Requisito
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {requisitos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay requisitos agregados. Haz clic en &quot;Agregar Requisito&quot; para comenzar.
                </p>
              ) : (
                <div className="space-y-4">
                  {requisitos.map((requisito, index) => (
                    <div key={index} className="flex gap-2 md:gap-4 items-start p-4 border rounded-lg">
                      <div className="flex-1 space-y-3">
                        <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium">Tipo</label>
                            <Select
                              value={requisito.tipo}
                              onValueChange={(value) => actualizarRequisito(index, 'tipo', value)}
                              disabled={camposRestringidos}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EXPERIENCIA">Experiencia</SelectItem>
                                <SelectItem value="EDUCACION">Educacion</SelectItem>
                                <SelectItem value="CONOCIMIENTO">Conocimiento</SelectItem>
                                <SelectItem value="HABILIDAD">Habilidad</SelectItem>
                                <SelectItem value="CERTIFICACION">Certificacion</SelectItem>
                                <SelectItem value="OTRO">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <Checkbox
                              id={`obligatorio-${index}`}
                              checked={requisito.obligatorio}
                              onCheckedChange={(checked) => actualizarRequisito(index, 'obligatorio', !!checked)}
                              disabled={camposRestringidos}
                            />
                            <label htmlFor={`obligatorio-${index}`} className="text-sm">
                              Obligatorio
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Descripcion</label>
                          <Input
                            value={requisito.descripcion}
                            onChange={(e) => actualizarRequisito(index, 'descripcion', e.target.value)}
                            placeholder="Ej: Minimo 2 años de experiencia en el cargo"
                            disabled={camposRestringidos}
                          />
                        </div>
                      </div>
                      {!camposRestringidos && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => eliminarRequisito(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 md:gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
