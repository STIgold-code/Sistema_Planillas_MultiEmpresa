'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
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

export default function NuevaVacantePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
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
        const [areasRes, cargosRes, sedesRes] = await Promise.all([
          api.get<Area[]>('/masters/areas'),
          api.get<Cargo[]>('/masters/cargos'),
          api.get<{ data: Sede[] }>('/sedes?limit=100'),
        ]);
        setAreas(areasRes);
        setCargos(cargosRes);
        setSedes(sedesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

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
      const payload = {
        titulo: data.titulo,
        descripcion: data.descripcion || undefined,
        area_id: data.area_id ? parseInt(data.area_id) : undefined,
        cargo_id: data.cargo_id ? parseInt(data.cargo_id) : undefined,
        sede_id: data.sede_id ? parseInt(data.sede_id) : undefined,
        cantidad_puestos: parseInt(data.cantidad_puestos),
        sueldo_ofrecido: data.sueldo_ofrecido ? parseFloat(data.sueldo_ofrecido) : undefined,
        tipo_contrato: data.tipo_contrato || undefined,
        modalidad: data.modalidad || undefined,
        fecha_cierre: data.fecha_cierre || undefined,
        requisitos: requisitos.length > 0 ? requisitos.filter(r => r.descripcion.trim()) : undefined,
      };

      await api.post('/vacantes', payload);
      toast.success('Vacante creada correctamente');
      router.push('/rrhh/seleccion/vacantes');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la vacante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Nueva Vacante</h1>
          <p className="text-muted-foreground">Crear una nueva vacante de empleo</p>
        </div>
      </div>

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
                      <Input {...field} placeholder="Ej: Analista de Sistemas" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        <Input {...field} type="number" min="1" placeholder="1" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                <Button type="button" variant="outline" size="sm" onClick={agregarRequisito}>
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
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => eliminarRequisito(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              Crear Vacante
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
