'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { Vacante, Procedencia } from '@/types';
import { PostulanteFormValues } from '../hooks/usePostulantes';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Search } from 'lucide-react';

interface DniConsultaResult {
  numero_documento: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

interface NuevoPostulanteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<PostulanteFormValues>;
  onSubmit: (data: PostulanteFormValues) => void;
  saving: boolean;
  vacantes: Vacante[];
  procedencias: Procedencia[];
  onClose: () => void;
}

export function NuevoPostulanteDialog({
  open,
  form,
  onSubmit,
  saving,
  vacantes,
  procedencias,
  onClose,
}: NuevoPostulanteDialogProps) {
  const [consultandoDni, setConsultandoDni] = useState(false);
  const esDni = form.watch('tipo_documento') === 'DNI';

  // Autocompleta nombres y apellidos desde RENIEC según el DNI ingresado.
  const handleConsultarDni = async () => {
    const dni = form.getValues('numero_documento');
    if (!/^\d{8}$/.test(dni)) {
      toast.error('Ingresa un DNI de 8 dígitos para consultar.');
      return;
    }
    setConsultandoDni(true);
    try {
      const data = await api.get<DniConsultaResult>(
        `/postulantes/consultar-dni/${dni}`,
      );
      form.setValue('apellido_paterno', data.apellido_paterno, {
        shouldValidate: true,
      });
      form.setValue('apellido_materno', data.apellido_materno, {
        shouldValidate: true,
      });
      form.setValue('nombres', data.nombres, { shouldValidate: true });
      toast.success('Datos de RENIEC cargados.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo consultar el DNI.'));
    } finally {
      setConsultandoDni(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Nuevo Postulante</DialogTitle>
          <DialogDescription className="text-sm">
            Registra un nuevo candidato. Podras completar los demas datos desde la pagina de edicion.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vacante_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 min-w-0">
                    <FormLabel>Vacante *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una vacante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vacantes.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.codigo} - {v.titulo}
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
                name="procedencia_id"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Procedencia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {procedencias.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo_documento"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Tipo Doc.</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero_documento"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Numero *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="12345678" />
                      </FormControl>
                      {esDni && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleConsultarDni}
                          disabled={consultandoDni}
                          aria-label="Buscar datos por DNI en RENIEC"
                          className="shrink-0"
                        >
                          {consultandoDni ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="apellido_paterno"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Apellido Paterno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="GARCIA" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido_materno"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Apellido Materno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="LOPEZ" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="JUAN CARLOS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-3">
              <FormField
                control={form.control}
                name="fecha_nacimiento"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Fecha Nacimiento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pretension_salarial"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Pretension (S/.)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="2500.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="correo@ejemplo.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="celular"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="987654321" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
