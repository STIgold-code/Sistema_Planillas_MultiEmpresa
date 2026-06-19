'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogoUpload } from '@/components/empresa/logo-upload';
import { Loader2, Building2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { REGIMENES_LISTA, obtenerRegimenInfo } from '@/lib/regimenes';

const empresaSchema = z.object({
  ruc: z
    .string()
    .length(11, 'El RUC debe tener 11 digitos')
    .regex(/^\d+$/, 'El RUC solo debe contener numeros'),
  razon_social: z.string().min(2, 'La razon social es requerida'),
  nombre_comercial: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  centro_control: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  representante_legal: z.string().optional(),
  dni_representante: z.string().max(12).optional(),
  cargo_representante: z.string().optional(),
  partida_electronica: z.string().optional(),
  logo_url: z.string().optional().nullable(),
  firma_representante_url: z.string().optional().nullable(),
  regimen_laboral_default: z.enum([
    'GENERAL',
    'PEQUENA_EMPRESA',
    'MICROEMPRESA',
    'AGRARIO',
    'CONSTRUCCION_CIVIL',
    'HOGAR',
  ]),
});

type EmpresaFormValues = z.infer<typeof empresaSchema>;

export default function EmpresaConfigPage() {
  const { empresa, loading, updating, updateEmpresa } = useEmpresa();

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      ruc: '',
      razon_social: '',
      nombre_comercial: '',
      direccion: '',
      telefono: '',
      centro_control: '',
      email: '',
      representante_legal: '',
      dni_representante: '',
      cargo_representante: '',
      partida_electronica: '',
      logo_url: null,
      firma_representante_url: null,
      regimen_laboral_default: 'GENERAL',
    },
  });

  useEffect(() => {
    if (empresa) {
      form.reset({
        ruc: empresa.ruc || '',
        razon_social: empresa.razon_social || '',
        nombre_comercial: empresa.nombre_comercial || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        centro_control: empresa.centro_control || '',
        email: empresa.email || '',
        representante_legal: empresa.representante_legal || '',
        dni_representante: empresa.dni_representante || '',
        cargo_representante: empresa.cargo_representante || '',
        partida_electronica: empresa.partida_electronica || '',
        logo_url: empresa.logo_url || null,
        firma_representante_url: empresa.firma_representante_url || null,
        regimen_laboral_default:
          obtenerRegimenInfo(empresa.regimen_laboral_default)?.value ?? 'GENERAL',
      });
    }
  }, [empresa, form]);

  const onSubmit = async (data: EmpresaFormValues) => {
    try {
      await updateEmpresa({
        ruc: data.ruc,
        razon_social: data.razon_social,
        nombre_comercial: data.nombre_comercial || undefined,
        direccion: data.direccion || undefined,
        telefono: data.telefono || undefined,
        centro_control: data.centro_control || undefined,
        email: data.email || undefined,
        representante_legal: data.representante_legal || undefined,
        dni_representante: data.dni_representante || undefined,
        cargo_representante: data.cargo_representante || undefined,
        partida_electronica: data.partida_electronica || undefined,
        logo_url: data.logo_url || undefined,
        firma_representante_url: data.firma_representante_url || undefined,
        regimen_laboral_default: data.regimen_laboral_default,
      });
      toast.success('Datos de la empresa actualizados correctamente');
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al guardar los cambios');
    }
  };

  const handleLogoUpload = (url: string) => {
    form.setValue('logo_url', url, { shouldDirty: true });
  };

  const handleLogoRemove = () => {
    form.setValue('logo_url', null, { shouldDirty: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuracion de Empresa
          </h1>
          <p className="text-muted-foreground">
            Administra los datos de tu empresa
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Datos Generales</CardTitle>
                <CardDescription>
                  Informacion basica de la empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="ruc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUC</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="20123456789"
                          maxLength={11}
                        />
                      </FormControl>
                      <FormDescription>
                        11 digitos numericos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="razon_social"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razon Social</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Empresa S.A.C."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nombre_comercial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Comercial</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Mi Empresa"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre de marca o comercial (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regimen_laboral_default"
                  render={({ field }) => {
                    const info = obtenerRegimenInfo(field.value);
                    return (
                      <FormItem>
                        <FormLabel>Régimen laboral por defecto</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un régimen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REGIMENES_LISTA.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {info && (
                          <FormDescription className="flex items-start gap-1.5">
                            <Info
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{info.implicaciones}</span>
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Logo de la empresa para documentos y reportes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUpload
                  currentLogoUrl={form.watch('logo_url')}
                  onUpload={handleLogoUpload}
                  onRemove={handleLogoRemove}
                  disabled={updating}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Firma del Representante</CardTitle>
                <CardDescription>
                  Firma digital para contratos y adendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUpload
                  currentLogoUrl={form.watch('firma_representante_url')}
                  onUpload={(url) => form.setValue('firma_representante_url', url, { shouldDirty: true })}
                  onRemove={() => form.setValue('firma_representante_url', null, { shouldDirty: true })}
                  disabled={updating}
                  uploadPath="/uploads/logos"
                  label="Arrastra la imagen de firma"
                  sublabel="PNG con fondo transparente recomendado (max. 5MB)"
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Representante Legal</CardTitle>
                <CardDescription>
                  Datos del representante legal para contratos y documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="representante_legal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="APELLIDOS NOMBRES"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dni_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DNI</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="12345678"
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cargo_representante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Gerente General"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partida_electronica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partida Electrónica</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="14325059"
                          />
                        </FormControl>
                        <FormDescription>
                          Número de partida en Registros Públicos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
                <CardDescription>
                  Informacion de contacto de la empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Direccion</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Av. Principal 123, Lima"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="01 234 5678"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="centro_control"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Control</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="922420278 / 993287592"
                          />
                        </FormControl>
                        <FormDescription>
                          Numeros de contacto del centro de control (usado en photocheck)
                        </FormDescription>
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
                          <Input
                            {...field}
                            type="email"
                            placeholder="contacto@empresa.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updating || !form.formState.isDirty}
              className="min-w-[150px]"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
